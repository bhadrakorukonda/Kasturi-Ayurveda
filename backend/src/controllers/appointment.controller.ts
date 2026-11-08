import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import z from 'zod';
import Appointment, { IAppointment } from '../models/Appointment.model';
import Doctor from '../models/Doctor.model';
import { getSettings, ISettings } from '../models/Settings.model';
import { sendAppointmentConfirmation } from '../utils/email.util';
import { generateDaySlots, isSlotWithinBookingWindow, utcToISTDateString } from '../utils/slots.util';
import { expireStaleHolds } from '../utils/holdExpiry.util';
import { generatePatientAccessToken } from '../utils/token.util';
import { env, PAYMENTS_ENABLED } from '../config/env';
import { createRazorpayOrder, RazorpayError } from '../utils/razorpay.util';
import { refundAppointment, RefundOutcome } from '../utils/refund.util';
import { PatientRequest } from '../middleware/patientAccess.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

// Patient-facing view: deliberately omits patient.phone/email/symptoms
// (the token holder already has their own contact info, no need to echo
// it back) and accessTokenHash. appointment.doctorId must be populated.
const toPatientSafeView = (appointment: any, settings: ISettings) => {
  const hoursUntilSlot = (new Date(appointment.slotStart).getTime() - Date.now()) / (1000 * 60 * 60);
  const cancellable = appointment.status === 'confirmed' && hoursUntilSlot >= settings.refundWindowHours;

  return {
    id: appointment._id,
    doctorName: appointment.doctorId?.name,
    specialization: appointment.doctorId?.specialization,
    slotStart: appointment.slotStart,
    slotEnd: appointment.slotEnd,
    mode: appointment.mode,
    paymentMode: appointment.paymentMode,
    paymentStatus: appointment.paymentStatus,
    status: appointment.status,
    amountDue: appointment.amountDue,
    amountPaid: appointment.amountPaid,
    amountRefunded: appointment.amountRefunded,
    currency: appointment.currency,
    meetLink: appointment.meetLink,
    patientName: appointment.patient?.name,
    cancellable,
  };
};

const isObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);

const createAppointmentSchema = z
  .object({
    doctorId: z.string().refine(isObjectId, 'Invalid doctorId'),
    slotStart: z.coerce.date(),
    mode: z.enum(['in_person', 'online']),
    paymentMode: z.enum(['pay_now', 'pay_at_clinic']),
    consentAccepted: z.boolean().optional(),
    patient: z
      .object({
        name: z.string().trim().min(1).max(100),
        phone: z.string().regex(/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'),
        email: z.string().trim().email().optional(),
        age: z.number().int().min(1).max(150).optional(),
        symptoms: z.string().trim().max(500).optional(),
      })
      .strict(),
  })
  .strict();

const updateAppointmentSchema = z
  .object({
    status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']),
    // Only meaningful with status 'cancelled' on a paid booking, where the
    // admin must choose explicitly (see updateAppointment).
    refund: z.boolean().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded', 'failed', 'needs_manual_refund']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(10),
});

const refundOutcomeLabel = (result: RefundOutcome | null): 'refunded' | 'needs_manual_refund' | 'none' => {
  if (!result || result.outcome === 'not_refundable') return 'none';
  return result.outcome === 'refunded' ? 'refunded' : 'needs_manual_refund';
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Public
export const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { doctorId, slotStart, mode, paymentMode, consentAccepted, patient } = parsed.data;

    if (mode === 'online' && paymentMode !== 'pay_now') {
      res.status(400).json({ status: 'error', message: 'Online consultations require pay_now' });
      return;
    }

    if (paymentMode === 'pay_now' && !PAYMENTS_ENABLED) {
      res.status(400).json({ status: 'error', message: 'Online payments are not available yet' });
      return;
    }

    if (mode === 'online' && !consentAccepted) {
      res.status(400).json({ status: 'error', message: 'Consent is required for online consultations' });
      return;
    }

    const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
    if (!doctor) {
      res.status(404).json({ status: 'error', message: 'Doctor not found' });
      return;
    }

    if (mode === 'online' && !doctor.supportsOnline) {
      res.status(400).json({ status: 'error', message: 'This doctor does not support online consultations' });
      return;
    }

    await expireStaleHolds();

    const settings = await getSettings();

    const dateIST = utcToISTDateString(slotStart);
    const daySlots = generateDaySlots(doctor, dateIST);
    const matchedSlot = daySlots.find((slot) => slot.start.getTime() === slotStart.getTime());

    if (!matchedSlot || !isSlotWithinBookingWindow(slotStart, settings)) {
      res.status(400).json({ status: 'error', message: 'The selected slot is not available for booking' });
      return;
    }

    const existingActive = await Appointment.findOne({
      doctorId,
      slotStart: matchedSlot.start,
      isActiveSlot: true,
    });
    if (existingActive) {
      res.status(409).json({ status: 'error', message: 'This slot is no longer available' });
      return;
    }

    const { token, hash } = generatePatientAccessToken();
    const isPayNow = paymentMode === 'pay_now';

    let appointment: IAppointment;
    try {
      appointment = await Appointment.create({
        doctorId,
        slotStart: matchedSlot.start,
        slotEnd: matchedSlot.end,
        kind: 'consultation',
        mode,
        paymentMode,
        currency: 'INR',
        amountDue: settings.consultationPrice.INR,
        paymentStatus: 'unpaid',
        // pay_now holds the slot until payment; ONLY a verified
        // payment.captured webhook moves it to confirmed.
        status: isPayNow ? 'pending_payment' : 'confirmed',
        holdExpiresAt: isPayNow ? new Date(Date.now() + settings.holdMinutes * 60 * 1000) : undefined,
        isActiveSlot: true,
        patient,
        consentAcceptedAt: mode === 'online' ? new Date() : undefined,
        accessTokenHash: hash,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        res.status(409).json({ status: 'error', message: 'This slot was just booked by someone else. Please choose another time.' });
        return;
      }
      throw error;
    }

    if (isPayNow) {
      let orderId: string;
      try {
        const order = await createRazorpayOrder({
          amount: appointment.amountDue,
          currency: 'INR',
          receipt: String(appointment._id),
          appointmentId: String(appointment._id),
        });
        orderId = order.id;
        await Appointment.updateOne({ _id: appointment._id }, { $set: { razorpayOrderId: orderId } });
      } catch (error) {
        // Release the hold immediately so the slot isn't blocked for
        // holdMinutes by a booking that can never be paid.
        await Appointment.updateOne(
          { _id: appointment._id },
          {
            $set: { status: 'cancelled', cancelledBy: 'system', cancelledAt: new Date() },
            $unset: { isActiveSlot: '', holdExpiresAt: '' },
          }
        );
        const detail =
          error instanceof RazorpayError ? `${error.httpStatus ?? 'network'} ${error.message}` : (error as Error).message;
        console.error(`❌ Razorpay order creation failed for appointment ${String(appointment._id)}: ${detail}`);
        res.status(502).json({ status: 'error', message: 'Could not start the payment. Please try again.' });
        return;
      }

      // No confirmation email yet: the booking isn't confirmed until the
      // webhook says the payment was captured (email is Phase 6).
      res.status(201).json({
        status: 'success',
        message: 'Slot held. Complete the payment to confirm your booking.',
        data: {
          id: appointment._id,
          doctorId: appointment.doctorId,
          slotStart: appointment.slotStart,
          slotEnd: appointment.slotEnd,
          mode: appointment.mode,
          paymentMode: appointment.paymentMode,
          status: appointment.status,
          amountDue: appointment.amountDue,
          holdExpiresAt: appointment.holdExpiresAt,
          accessToken: token,
          payment: {
            keyId: env.RAZORPAY_KEY_ID,
            orderId,
            amount: appointment.amountDue,
            currency: appointment.currency,
          },
        },
      });
      return;
    }

    try {
      await sendAppointmentConfirmation(appointment, token);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'Appointment created successfully',
      data: {
        id: appointment._id,
        doctorId: appointment.doctorId,
        slotStart: appointment.slotStart,
        slotEnd: appointment.slotEnd,
        mode: appointment.mode,
        paymentMode: appointment.paymentMode,
        status: appointment.status,
        amountDue: appointment.amountDue,
        accessToken: token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private (Admin/Staff)
export const getAllAppointments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsedQuery = listQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query', errors: parsedQuery.error.format() });
      return;
    }
    const { status, paymentStatus, date, page, limit } = parsedQuery.data;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.slotStart = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialization')
      .sort({ slotStart: 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment — patient (via ?token=) or admin/staff (via JWT)
// @route   GET /api/appointments/:id
// @access  Dual: public+token, or Private (Admin/Staff)
export const getAppointment = async (
  req: PatientRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.patientAppointment) {
      const populated = await req.patientAppointment.populate('doctorId', 'name specialization');
      const settings = await getSettings();
      res.status(200).json({ status: 'success', data: toPatientSafeView(populated, settings) });
      return;
    }

    const appointment = await Appointment.findById(req.params.id).populate('doctorId', 'name specialization');

    if (!appointment) {
      res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patient cancels their own appointment
// @route   POST /api/appointments/:id/cancel?token=
// @access  Public, token-gated
export const cancelAppointment = async (
  req: PatientRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointment = req.patientAppointment as IAppointment;
    const settings = await getSettings();
    const refundWindowMs = settings.refundWindowHours * 60 * 60 * 1000;

    // Atomic claim: only one cancel request can win, and the 24h rule is
    // enforced in the same query, so a double click or a race can never
    // cancel (or refund) twice.
    const cancelled = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        status: 'confirmed',
        slotStart: { $gte: new Date(Date.now() + refundWindowMs) },
      },
      {
        $set: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'patient' },
        $unset: { isActiveSlot: '' },
      },
      { new: true }
    );

    if (!cancelled) {
      const message =
        appointment.status !== 'confirmed'
          ? 'This appointment cannot be cancelled.'
          : `Cancellations within ${settings.refundWindowHours} hours of the appointment aren't allowed online. Please call the clinic.`;
      res.status(400).json({ status: 'error', message });
      return;
    }

    // Paid bookings get a full automatic refund. If Razorpay fails, the
    // booking stays cancelled and the refund is flagged for an admin.
    const refundResult = cancelled.paymentStatus === 'paid' ? await refundAppointment(cancelled._id) : null;

    const updated = await Appointment.findById(cancelled._id).populate('doctorId', 'name specialization');

    res.status(200).json({
      status: 'success',
      message: 'Appointment cancelled',
      refund: refundOutcomeLabel(refundResult),
      data: toPatientSafeView(updated, settings),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id
// @access  Private (Admin/Staff)
export const updateAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateAppointmentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { status, refund } = parsed.data;

    if (refund === true && (req as AuthRequest).user?.role !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Only an admin can issue refunds.' });
      return;
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Appointment not found' });
      return;
    }

    if (status === 'cancelled' && existing.status !== 'cancelled' && existing.paymentStatus === 'paid' && refund === undefined) {
      // Force an explicit decision so a paid booking is never cancelled
      // with the money forgotten about.
      res.status(400).json({
        status: 'error',
        message: 'This booking is paid. Specify refund: true or refund: false when cancelling.',
      });
      return;
    }

    const update: Record<string, unknown> = { status };
    const unset: Record<string, string> = { holdExpiresAt: '' };

    if (status === 'confirmed') {
      // Re-claim the slot (e.g. undoing an accidental cancel). The partial
      // unique index rejects this if someone else has booked it since.
      update.isActiveSlot = true;
    } else {
      unset.isActiveSlot = '';
      if (status === 'cancelled' && existing.status !== 'cancelled') {
        update.cancelledAt = new Date();
        update.cancelledBy = 'admin';
      }
    }

    let appointment: IAppointment | null;
    try {
      appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        { $set: update, $unset: unset },
        { new: true, runValidators: true }
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        res.status(409).json({
          status: 'error',
          message: 'That slot has been booked by someone else since, so this appointment cannot be re-confirmed.',
        });
        return;
      }
      throw error;
    }

    if (!appointment) {
      res.status(404).json({ status: 'error', message: 'Appointment not found' });
      return;
    }

    let refundResult: RefundOutcome | null = null;
    if (status === 'cancelled' && refund === true) {
      refundResult = await refundAppointment(appointment._id);
      appointment = (await Appointment.findById(appointment._id)) ?? appointment;
    }

    res.status(200).json({
      status: 'success',
      message:
        refundResult?.outcome === 'failed'
          ? 'Appointment updated, but the refund failed. It is flagged as needing a manual refund.'
          : 'Appointment updated successfully',
      refund: refundOutcomeLabel(refundResult),
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund an appointment's payment in full (any time, any status)
// @route   POST /api/appointments/:id/refund
// @access  Private (Admin)
export const refundAppointmentAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!PAYMENTS_ENABLED) {
      res.status(404).json({ status: 'error', message: 'Route not found' });
      return;
    }

    if (!isObjectId(req.params.id as string)) {
      res.status(400).json({ status: 'error', message: 'Invalid ID format' });
      return;
    }

    const result = await refundAppointment(req.params.id);

    if (result.outcome === 'not_refundable') {
      res.status(409).json({
        status: 'error',
        message: 'Nothing to refund: this booking is unpaid, already refunded, or a refund is already in progress.',
      });
      return;
    }

    if (result.outcome === 'failed') {
      res.status(502).json({
        status: 'error',
        message: 'Razorpay rejected the refund. It is flagged as needing a manual refund; check the Razorpay dashboard.',
        data: result.appointment,
      });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Refund issued', data: result.appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Admin)
export const deleteAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
