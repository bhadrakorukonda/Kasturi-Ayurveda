import { Types } from 'mongoose';
import Appointment, { IAppointment } from '../models/Appointment.model';
import { createRazorpayRefund, RazorpayError, RazorpayRefund } from './razorpay.util';

// A lock older than this is assumed to belong to a request that died
// mid-call. Re-claiming it is safe: Razorpay itself rejects a second full
// refund of an already fully refunded payment, so the worst case is the
// appointment landing in needs_manual_refund for an admin to check.
const STALE_LOCK_MS = 5 * 60 * 1000;

export type RefundOutcome =
  | { outcome: 'refunded'; appointment: IAppointment }
  | { outcome: 'not_refundable' }
  | { outcome: 'failed'; appointment: IAppointment | null };

// Full refund of whatever has been paid and not yet refunded.
//
// Idempotency: the appointment is claimed with a single atomic
// findOneAndUpdate that only matches when there is a captured payment, no
// recorded refund, and no live lock. Only the request that wins the claim
// talks to Razorpay; everyone else gets not_refundable. A recorded
// razorpayRefundId means "already refunded" forever after.
//
// Never throws for Razorpay errors: on failure the appointment is moved to
// needs_manual_refund so it surfaces in the admin dashboard and the money
// is never silently lost.
export const refundAppointment = async (appointmentId: Types.ObjectId | string): Promise<RefundOutcome> => {
  const now = new Date();

  const claimed = await Appointment.findOneAndUpdate(
    {
      _id: appointmentId,
      paymentStatus: { $in: ['paid', 'needs_manual_refund'] },
      razorpayPaymentId: { $exists: true },
      razorpayRefundId: { $exists: false },
      amountPaid: { $gt: 0 },
      $or: [
        { refundLockedAt: { $exists: false } },
        { refundLockedAt: { $lt: new Date(now.getTime() - STALE_LOCK_MS) } },
      ],
    },
    { $set: { refundLockedAt: now } },
    { new: true }
  );

  if (!claimed) {
    return { outcome: 'not_refundable' };
  }

  const amount = claimed.amountPaid - claimed.amountRefunded;
  if (amount <= 0) {
    await Appointment.updateOne({ _id: claimed._id }, { $unset: { refundLockedAt: '' } });
    return { outcome: 'not_refundable' };
  }

  let refund: RazorpayRefund;
  try {
    refund = await createRazorpayRefund({
      paymentId: claimed.razorpayPaymentId as string,
      amount,
      appointmentId: String(claimed._id),
    });
  } catch (error) {
    const detail =
      error instanceof RazorpayError
        ? `${error.httpStatus ?? 'network'} ${error.code ?? ''} ${error.message}`
        : (error as Error).message;
    console.error(`❌ Refund failed for appointment ${String(claimed._id)}: ${detail}`);

    const failed = await Appointment.findOneAndUpdate(
      { _id: claimed._id, refundLockedAt: now },
      { $set: { paymentStatus: 'needs_manual_refund' }, $unset: { refundLockedAt: '' } },
      { new: true }
    );
    return { outcome: 'failed', appointment: failed };
  }

  // From here the money has moved. Log the id first so it is never lost
  // even if the DB write below fails.
  console.log(`✅ Razorpay refund ${refund.id} created for appointment ${String(claimed._id)}`);

  const recordRefund = {
    $set: { paymentStatus: 'refunded', razorpayRefundId: refund.id },
    $inc: { amountRefunded: amount },
    $unset: { refundLockedAt: '' },
  };

  const updated = await Appointment.findOneAndUpdate({ _id: claimed._id, refundLockedAt: now }, recordRefund, {
    new: true,
  });
  if (updated) {
    return { outcome: 'refunded', appointment: updated };
  }

  // Our lock was taken over as stale while Razorpay was slow. The refund
  // DID happen, so record it rather than lose it.
  const recorded = await Appointment.findOneAndUpdate(
    { _id: claimed._id, razorpayRefundId: { $exists: false } },
    recordRefund,
    { new: true }
  );
  if (recorded) {
    return { outcome: 'refunded', appointment: recorded };
  }

  console.error(
    `❌ Refund ${refund.id} succeeded for appointment ${String(claimed._id)} but another refund was already recorded. Check the Razorpay dashboard.`
  );
  return { outcome: 'failed', appointment: await Appointment.findById(claimed._id) };
};
