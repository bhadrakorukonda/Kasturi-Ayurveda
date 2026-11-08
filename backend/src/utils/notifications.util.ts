import { Types } from 'mongoose';
import Appointment, { IAppointment } from '../models/Appointment.model';
import { generatePatientAccessToken, MAX_ADDITIONAL_TOKENS } from './token.util';
import { ensureMeetForAppointment, deleteMeetEvent } from './googleMeet.util';
import {
  sendBookingConfirmation,
  sendCancellation,
  sendClinicNewBooking,
  sendMeetLinkReady,
  sendRefundNotice,
  sendReminder,
  RefundNote,
} from './email.util';
import { expireStaleHolds } from './holdExpiry.util';
import { logger } from './logger';

// Everything slow or flaky that happens AFTER a booking changes state:
// Meet links, emails, reminders. Design:
//  - Request handlers respond first, then call these in the background
//    (runInBackground), so a slow provider never delays the patient or a
//    Razorpay webhook retry.
//  - Anything that must eventually happen (confirmation, Meet link,
//    reminder) is tracked in the DB and retried by the scheduled job
//    (runScheduledJobs, called by GitHub Actions via POST /api/jobs/run).
//  - Work on one appointment is claimed atomically (notifyLockedAt /
//    reminderSentAt) so the request path and the job never double-send.
//  - Logs carry appointment ids only, never patient data.

type Id = Types.ObjectId | string;

const LOCK_STALE_MS = 5 * 60 * 1000;
const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 25;

// Never let a background failure crash the process (server.ts exits on
// unhandledRejection).
export const runInBackground = (label: string, task: () => Promise<unknown>): void => {
  task().catch((err) => logger.error('background task failed', { task: label, err }));
};

const lockIsFree = (now: Date) => ({
  $or: [{ notifyLockedAt: { $exists: false } }, { notifyLockedAt: { $lt: new Date(now.getTime() - LOCK_STALE_MS) } }],
});

const releaseLock = (id: Id, lockedAt: Date, extra: { $set?: Record<string, unknown>; $unset?: Record<string, ''> } = {}) =>
  Appointment.updateOne(
    { _id: id, notifyLockedAt: lockedAt },
    { ...(extra.$set ? { $set: extra.$set } : {}), $unset: { notifyLockedAt: '', ...(extra.$unset ?? {}) } }
  );

// The raw access token is never stored, so each email that needs the
// "manage booking" link mints a new token and stores only its hash.
export const issueAdditionalAccessToken = async (id: Id): Promise<string> => {
  const { token, hash } = generatePatientAccessToken();
  await Appointment.updateOne(
    { _id: id },
    { $push: { additionalAccessTokenHashes: { $each: [hash], $slice: -MAX_ADDITIONAL_TOKENS } } }
  );
  return token;
};

const tryCreateMeet = async (appointment: IAppointment): Promise<boolean> => {
  try {
    const { eventId, meetLink } = await ensureMeetForAppointment(appointment);
    await Appointment.updateOne({ _id: appointment._id }, { $set: { meetLink, googleEventId: eventId } });
    appointment.meetLink = meetLink;
    appointment.googleEventId = eventId;
    return true;
  } catch (error) {
    logger.error('meet link creation failed', { appointmentId: String(appointment._id), err: error });
    return false;
  }
};

// Confirmation work for a newly confirmed booking: Meet link (online),
// patient confirmation email, clinic notification. Pass the booking's
// original token when the caller still has it (pay_at_clinic at create
// time); otherwise a fresh one is minted.
export const processConfirmation = async (id: Id, knownToken?: string): Promise<'done' | 'skipped' | 'failed'> => {
  const now = new Date();
  const appointment = await Appointment.findOneAndUpdate(
    { _id: id, status: 'confirmed', confirmationPending: true, ...lockIsFree(now) },
    { $set: { notifyLockedAt: now } },
    { new: true }
  );
  if (!appointment) return 'skipped';

  // If Meet fails, still confirm by email (it says the link will follow);
  // retryMissingMeetLinks keeps trying and emails the link when ready.
  if (appointment.mode === 'online' && !appointment.meetLink) {
    await tryCreateMeet(appointment);
  }

  try {
    if (appointment.patient.email) {
      const token = knownToken ?? (await issueAdditionalAccessToken(appointment._id));
      await sendBookingConfirmation(appointment, token);
    }
  } catch (error) {
    logger.error('confirmation email failed, will retry', { appointmentId: String(appointment._id), err: error });
    await releaseLock(appointment._id, now); // stays confirmationPending -> job retries
    return 'failed';
  }

  await releaseLock(appointment._id, now, { $unset: { confirmationPending: '' } });

  // Clinic notification is nice-to-have: log on failure, don't retry
  // (retrying would mean re-sending the patient email too).
  await sendClinicNewBooking(appointment).catch((err) =>
    logger.error('clinic notification failed', { appointmentId: String(appointment._id), err })
  );
  return 'done';
};

// Online bookings whose Meet link failed at confirmation time.
export const retryMissingMeetLinks = async (): Promise<number> => {
  const now = new Date();
  const candidates = await Appointment.find(
    { status: 'confirmed', mode: 'online', meetLink: { $exists: false }, confirmationPending: { $ne: true }, slotStart: { $gt: now } },
    { _id: 1 }
  ).limit(BATCH_LIMIT);

  let fixed = 0;
  for (const { _id } of candidates) {
    const lockedAt = new Date();
    const appointment = await Appointment.findOneAndUpdate(
      { _id, meetLink: { $exists: false }, ...lockIsFree(lockedAt) },
      { $set: { notifyLockedAt: lockedAt } },
      { new: true }
    );
    if (!appointment) continue;

    if (await tryCreateMeet(appointment)) {
      fixed++;
      try {
        if (appointment.patient.email) {
          await sendMeetLinkReady(appointment, await issueAdditionalAccessToken(appointment._id));
        }
      } catch (error) {
        // The link is on the booking page and will be in the reminder.
        logger.error('meet link email failed', { appointmentId: String(appointment._id), err: error });
      }
    }
    await releaseLock(appointment._id, lockedAt);
  }
  return fixed;
};

// 24h reminders. Only for bookings made more than 24h ahead (a booking for
// later today doesn't need a reminder on top of its confirmation).
// reminderSentAt doubles as the claim: set first, unset if sending fails.
export const sendDueReminders = async (): Promise<number> => {
  const now = new Date();
  const failed: Types.ObjectId[] = [];
  let sent = 0;

  for (let i = 0; i < BATCH_LIMIT; i++) {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: { $nin: failed },
        status: 'confirmed',
        reminderSentAt: { $exists: false },
        confirmationPending: { $ne: true },
        'patient.email': { $exists: true },
        slotStart: { $gt: now, $lte: new Date(now.getTime() + REMINDER_LEAD_MS) },
        $expr: { $lte: ['$createdAt', { $subtract: ['$slotStart', REMINDER_LEAD_MS] }] },
      },
      { $set: { reminderSentAt: now } },
      { new: true }
    );
    if (!appointment) break;

    try {
      await sendReminder(appointment, await issueAdditionalAccessToken(appointment._id));
      sent++;
    } catch (error) {
      logger.error('reminder failed, will retry', { appointmentId: String(appointment._id), err: error });
      await Appointment.updateOne({ _id: appointment._id, reminderSentAt: now }, { $unset: { reminderSentAt: '' } });
      failed.push(appointment._id as Types.ObjectId);
    }
  }
  return sent;
};

// After a confirmed booking is cancelled (patient or admin): free the
// doctor's calendar and tell the patient. Best-effort, not retried.
export const notifyCancellation = async (id: Id, refund: RefundNote): Promise<void> => {
  const appointment = await Appointment.findById(id);
  if (!appointment || appointment.status !== 'cancelled') return;

  if (appointment.googleEventId) {
    try {
      await deleteMeetEvent(appointment.googleEventId);
      // Clear the dead link; if an admin re-confirms the booking later,
      // retryMissingMeetLinks revives the event and emails the link.
      await Appointment.updateOne({ _id: appointment._id }, { $unset: { meetLink: '', googleEventId: '' } });
    } catch (error) {
      logger.error('calendar event delete failed', { appointmentId: String(appointment._id), err: error });
    }
  }
  await sendCancellation(appointment, refund);
};

export const notifyRefund = async (id: Id): Promise<void> => {
  const appointment = await Appointment.findById(id);
  if (!appointment || appointment.paymentStatus !== 'refunded') return;
  await sendRefundNotice(appointment);
};

// One pass of all scheduled work. Safe to run concurrently or repeatedly.
export const runScheduledJobs = async (): Promise<Record<string, number>> => {
  await expireStaleHolds();

  const pending = await Appointment.find({ status: 'confirmed', confirmationPending: true }, { _id: 1 }).limit(BATCH_LIMIT);
  let confirmationsSent = 0;
  for (const { _id } of pending) {
    if ((await processConfirmation(_id)) === 'done') confirmationsSent++;
  }

  const meetLinksCreated = await retryMissingMeetLinks();
  const remindersSent = await sendDueReminders();

  return { confirmationsSent, meetLinksCreated, remindersSent };
};
