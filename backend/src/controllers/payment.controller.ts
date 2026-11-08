import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import Appointment from '../models/Appointment.model';
import { verifyWebhookSignature } from '../utils/razorpay.util';
import { processConfirmation, runInBackground } from '../utils/notifications.util';

// Only the fields we actually use. passthrough() so Razorpay adding fields
// never breaks parsing; anything we don't recognise is simply ignored.
const paymentEntitySchema = z
  .object({
    id: z.string().min(1),
    order_id: z.string().min(1).nullable().optional(),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
  })
  .passthrough();

const refundEntitySchema = z
  .object({
    id: z.string().min(1),
    payment_id: z.string().min(1),
    amount: z.number().int().nonnegative(),
  })
  .passthrough();

const webhookSchema = z
  .object({
    event: z.string(),
    payload: z
      .object({
        payment: z.object({ entity: paymentEntitySchema }).passthrough().optional(),
        refund: z.object({ entity: refundEntitySchema }).passthrough().optional(),
      })
      .passthrough(),
  })
  .passthrough();

type PaymentEntity = z.infer<typeof paymentEntitySchema>;
type RefundEntity = z.infer<typeof refundEntitySchema>;

// payment.captured: the ONLY thing that ever confirms a pay_now booking.
// Returns the appointment id when this call confirmed it, so the caller can
// start the confirmation work (Meet + email) after responding to Razorpay.
const handlePaymentCaptured = async (payment: PaymentEntity): Promise<string | void> => {
  // Idempotency: this exact payment has already been processed (either
  // confirmed, refunded, or flagged for manual refund). Do nothing.
  if (await Appointment.exists({ razorpayPaymentId: payment.id })) {
    return;
  }

  if (!payment.order_id) {
    console.warn(`⚠️  payment.captured ${payment.id} has no order_id; not one of ours, ignoring.`);
    return;
  }

  const appointment = await Appointment.findOne({ razorpayOrderId: payment.order_id });
  if (!appointment) {
    // Money arrived that we can't match to a booking. Loud log with ids
    // only (no PII) so it can be reconciled from the Razorpay dashboard.
    console.error(
      `❌ payment.captured ${payment.id} for unknown order ${payment.order_id}. Reconcile manually in Razorpay.`
    );
    return;
  }

  const amountMatches = payment.amount === appointment.amountDue && payment.currency === appointment.currency;

  // Happy path: the hold is still ours (pending_payment + isActiveSlot).
  // Even if holdExpiresAt has technically passed, nobody else can have the
  // slot while isActiveSlot is still set, so confirming is safe.
  if (amountMatches) {
    const confirmed = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        status: 'pending_payment',
        isActiveSlot: true,
        razorpayPaymentId: { $exists: false },
      },
      {
        $set: {
          status: 'confirmed',
          paymentStatus: 'paid',
          amountPaid: payment.amount,
          razorpayPaymentId: payment.id,
          // Meet link + confirmation email are due; done after responding,
          // and retried by the scheduled job if that fails.
          confirmationPending: true,
        },
        $unset: { holdExpiresAt: '' },
      },
      { new: true }
    );

    if (confirmed) {
      console.log(`✅ Appointment ${String(confirmed._id)} confirmed by payment ${payment.id}`);
      return String(confirmed._id);
    }
  }

  // The hold expired and was released (or was cancelled), or the amount
  // doesn't match what we charged. Either way the patient paid and has no
  // valid booking: record the payment and flag it for an admin to refund.
  // Never silently lose a payment.
  const flagged = await Appointment.findOneAndUpdate(
    { _id: appointment._id, razorpayPaymentId: { $exists: false } },
    {
      $set: {
        paymentStatus: 'needs_manual_refund',
        amountPaid: payment.amount,
        razorpayPaymentId: payment.id,
      },
    },
    { new: true }
  );

  if (flagged) {
    console.error(
      `❌ Payment ${payment.id} captured for appointment ${String(appointment._id)} that is no longer holding its slot` +
        `${amountMatches ? '' : ' (amount/currency mismatch)'}. Flagged needs_manual_refund.`
    );
    return;
  }

  // The appointment already has a different payment recorded. Razorpay
  // shouldn't allow a second capture on a paid order, but if it happens we
  // must not overwrite the first one.
  console.error(
    `❌ Second payment ${payment.id} captured for order ${payment.order_id} (appointment ${String(appointment._id)}). Refund it manually in Razorpay.`
  );
};

// payment.failed: mark it so the dashboard shows why the booking didn't go
// through. The hold is left alone; the patient can retry in Checkout (same
// order) until it expires, and a later payment.captured still confirms.
const handlePaymentFailed = async (payment: PaymentEntity): Promise<void> => {
  if (!payment.order_id) return;

  await Appointment.updateOne(
    {
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: { $exists: false },
      paymentStatus: 'unpaid',
    },
    { $set: { paymentStatus: 'failed' } }
  );
};

// refund.failed: Razorpay accepted our refund request but couldn't complete
// it. Undo our bookkeeping and flag for an admin, who can retry from the
// dashboard (clearing razorpayRefundId is what makes a retry possible).
const handleRefundFailed = async (refund: RefundEntity): Promise<void> => {
  const updated = await Appointment.findOneAndUpdate(
    { razorpayRefundId: refund.id },
    {
      $set: { paymentStatus: 'needs_manual_refund' },
      $inc: { amountRefunded: -refund.amount },
      $unset: { razorpayRefundId: '' },
    },
    { new: true }
  );

  if (updated) {
    console.error(`❌ Refund ${refund.id} failed for appointment ${String(updated._id)}. Flagged needs_manual_refund.`);
  }
};

// @desc    Razorpay webhook
// @route   POST /api/payments/webhook
// @access  Razorpay only (HMAC signature on the raw body)
export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({ status: 'error', message: 'Invalid payload' });
      return;
    }

    if (!verifyWebhookSignature(rawBody, req.headers['x-razorpay-signature'])) {
      res.status(400).json({ status: 'error', message: 'Invalid signature' });
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.status(400).json({ status: 'error', message: 'Invalid payload' });
      return;
    }

    const parsed = webhookSchema.safeParse(json);
    if (!parsed.success) {
      // Signed by Razorpay but not a shape we handle. Acknowledge so it
      // isn't retried forever.
      res.status(200).json({ status: 'ignored' });
      return;
    }

    const { event, payload } = parsed.data;
    let confirmedId: string | void = undefined;

    switch (event) {
      case 'payment.captured':
        if (payload.payment) confirmedId = await handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        if (payload.payment) await handlePaymentFailed(payload.payment.entity);
        break;
      case 'refund.failed':
        if (payload.refund) await handleRefundFailed(payload.refund.entity);
        break;
      default:
        // Every other event (order.paid, refund.processed, ...) is ignored.
        break;
    }

    // Any DB error above throws to next() -> 500, so Razorpay retries.
    res.status(200).json({ status: 'ok' });

    // Slow work after the 200 (Razorpay times out webhooks after a few
    // seconds). A retried delivery is a no-op, so this runs exactly once
    // here, with the scheduled job as the safety net.
    if (confirmedId) {
      const id = confirmedId;
      runInBackground('confirmation', () => processConfirmation(id));
    }
  } catch (error) {
    next(error);
  }
};
