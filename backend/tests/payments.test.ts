import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  capturedPayload,
  patient,
  PRICE_PAISE,
  settle,
  signWebhook,
  startTestApp,
  TestContext,
  TEST_SECRETS,
  waitFor,
  webhookBody,
} from './helpers/testApp';

// Razorpay flows with PAYMENTS_ENABLED=true. Razorpay itself is faked
// (tests/helpers/fakeProviders.ts); everything on our side is real.

let t: TestContext;

beforeAll(async () => {
  t = await startTestApp({ paymentsEnabled: true });
});
afterAll(async () => {
  await t.close();
});
beforeEach(() => {
  t.fakes.fail = { email: false, google: false, refund: false, order: false };
  t.fakes.refundDelayMs = 0;
});

interface Booked {
  id: string;
  accessToken: string;
  payment: { orderId: string; keyId: string; amount: number; currency: string };
}

const bookPayNow = async (extra: Record<string, unknown> = {}): Promise<Booked> => {
  const res = await t
    .api()
    .post('/api/appointments')
    .send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'in_person', paymentMode: 'pay_now', patient: patient(), ...extra });
  expect(res.status).toBe(201);
  return res.body.data;
};

const sendWebhook = (raw: string, signature = signWebhook(raw)) =>
  t.api().post('/api/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', signature).send(raw);

const capture = (paymentId: string, orderId: string, amount = PRICE_PAISE) =>
  sendWebhook(webhookBody('payment.captured', capturedPayload(paymentId, orderId, amount)));

const bookAndPay = async (paymentId: string, extra: Record<string, unknown> = {}): Promise<Booked> => {
  const booked = await bookPayNow(extra);
  expect((await capture(paymentId, booked.payment.orderId)).status).toBe(200);
  // let the after-response confirmation work finish
  await waitFor(async () => !(await t.models.Appointment.findById(booked.id))!.confirmationPending);
  return booked;
};

const doc = (id: string) => t.models.Appointment.findById(id).lean();

describe('pay_now creates a hold and a server-side order', () => {
  it('holds the slot as pending_payment with an order for the Settings price', async () => {
    const booked = await bookPayNow();
    expect(booked.payment).toMatchObject({ keyId: TEST_SECRETS.RAZORPAY_KEY_ID, amount: PRICE_PAISE, currency: 'INR' });
    expect(t.fakes.orders.at(-1)).toMatchObject({ id: booked.payment.orderId, amount: PRICE_PAISE, currency: 'INR' });

    const d = await doc(booked.id);
    expect(d).toMatchObject({ status: 'pending_payment', paymentStatus: 'unpaid', isActiveSlot: true, razorpayOrderId: booked.payment.orderId });
    expect(new Date(d!.holdExpiresAt!).getTime()).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
  });

  it('a held slot cannot be booked by anyone else', async () => {
    const booked = await bookPayNow();
    const slotStart = (await doc(booked.id))!.slotStart.toISOString();
    const res = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart, mode: 'in_person', paymentMode: 'pay_at_clinic', patient: patient() });
    expect(res.status).toBe(409);
  });

  it('if Razorpay order creation fails: 502 and the slot is released immediately', async () => {
    t.fakes.fail.order = true;
    const slotStart = await t.nextSlot();
    const res = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart, mode: 'in_person', paymentMode: 'pay_now', patient: patient() });
    expect(res.status).toBe(502);
    t.fakes.fail.order = false;

    const held = await t.models.Appointment.findOne({ slotStart: new Date(slotStart) }).lean();
    expect(held).toMatchObject({ status: 'cancelled', cancelledBy: 'system' });
    expect(held!.isActiveSlot).toBeUndefined();
    const again = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart, mode: 'in_person', paymentMode: 'pay_at_clinic', patient: patient() });
    expect(again.status).toBe(201);
  });
});

describe('online consultations', () => {
  it('online booking without consent is rejected', async () => {
    const res = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'online', paymentMode: 'pay_now', patient: patient() });
    expect(res.status).toBe(400);
  });

  it('pay-at-clinic is rejected for online mode', async () => {
    const res = await t
      .api()
      .post('/api/appointments')
      .send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'online', paymentMode: 'pay_at_clinic', consentAccepted: true, patient: patient() });
    expect(res.status).toBe(400);
  });

  it('online with consent records consentAcceptedAt', async () => {
    const booked = await bookPayNow({ mode: 'online', consentAccepted: true });
    expect((await doc(booked.id))!.consentAcceptedAt).toBeTruthy();
  });

  it('config exposes online mode', async () => {
    const res = await t.api().get('/api/config');
    expect(res.body.data.modes).toEqual(['in_person', 'online']);
    expect(res.body.data.paymentsEnabled).toBe(true);
  });
});

describe('webhook security', () => {
  it('rejects an invalid signature and changes nothing', async () => {
    const booked = await bookPayNow();
    const raw = webhookBody('payment.captured', capturedPayload('pay_bad', booked.payment.orderId));
    const res = await sendWebhook(raw, signWebhook(raw + 'tampered'));
    expect(res.status).toBe(400);
    expect(await doc(booked.id)).toMatchObject({ status: 'pending_payment', paymentStatus: 'unpaid' });
  });

  it('rejects a missing signature', async () => {
    const res = await t.api().post('/api/payments/webhook').set('Content-Type', 'application/json').send(webhookBody('payment.captured', {}));
    expect(res.status).toBe(400);
  });

  it('rejects a body that was modified after signing', async () => {
    const booked = await bookPayNow();
    const raw = webhookBody('payment.captured', capturedPayload('pay_mod', booked.payment.orderId));
    const res = await sendWebhook(raw.replace(String(PRICE_PAISE), '1'), signWebhook(raw));
    expect(res.status).toBe(400);
  });

  it('acknowledges events it does not handle', async () => {
    const res = await sendWebhook(webhookBody('order.paid', { order: { entity: { id: 'order_x' } } }));
    expect(res.status).toBe(200);
  });
});

describe('payment.captured confirms the booking, exactly once', () => {
  it('confirms, records the payment and clears the hold', async () => {
    const booked = await bookAndPay('pay_confirm_1');
    const d = await doc(booked.id);
    expect(d).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', amountPaid: PRICE_PAISE, razorpayPaymentId: 'pay_confirm_1', isActiveSlot: true });
    expect(d!.holdExpiresAt).toBeUndefined();
  });

  it('duplicate deliveries (including concurrent) do not double-confirm or re-send email', async () => {
    const booked = await bookAndPay('pay_dup_1');
    const before = await doc(booked.id);
    const confirmationsBefore = t.fakes.emailsFor(booked.id).filter((e) => e.tag.startsWith('confirmation')).length;

    const results = await Promise.all(Array.from({ length: 5 }, () => capture('pay_dup_1', booked.payment.orderId)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    await settle();

    const after = await doc(booked.id);
    expect(after!.updatedAt).toEqual(before!.updatedAt);
    expect(t.fakes.emailsFor(booked.id).filter((e) => e.tag.startsWith('confirmation'))).toHaveLength(confirmationsBefore);
  });

  it('payment for an unknown order is acknowledged and nothing breaks', async () => {
    const res = await capture('pay_orphan', 'order_does_not_exist');
    expect(res.status).toBe(200);
  });

  it('payment.failed marks the attempt failed but keeps the hold; a retry still confirms', async () => {
    const booked = await bookPayNow();
    const failed = { payment: { entity: { id: 'pay_failed_1', order_id: booked.payment.orderId, amount: PRICE_PAISE, currency: 'INR' } } };
    await sendWebhook(webhookBody('payment.failed', failed));
    expect(await doc(booked.id)).toMatchObject({ status: 'pending_payment', paymentStatus: 'failed', isActiveSlot: true });

    await capture('pay_retry_ok', booked.payment.orderId);
    expect(await doc(booked.id)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
  });
});

describe('payment arriving after the hold expired', () => {
  it('is recorded and flagged needs_manual_refund, never lost', async () => {
    const booked = await bookPayNow();
    await t.models.Appointment.updateOne({ _id: booked.id }, { $set: { holdExpiresAt: new Date(Date.now() - 60_000) } });
    await t.api().get(`/api/availability?doctorId=${t.doctorId}&date=2030-01-01`); // lazy expiry
    expect(await doc(booked.id)).toMatchObject({ status: 'cancelled', cancelledBy: 'system' });

    // someone else takes the freed slot
    const slotStart = (await doc(booked.id))!.slotStart.toISOString();
    const other = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart, mode: 'in_person', paymentMode: 'pay_at_clinic', patient: patient() });
    expect(other.status).toBe(201);

    expect((await capture('pay_late_1', booked.payment.orderId)).status).toBe(200);
    expect(await doc(booked.id)).toMatchObject({
      status: 'cancelled',
      paymentStatus: 'needs_manual_refund',
      razorpayPaymentId: 'pay_late_1',
      amountPaid: PRICE_PAISE,
    });

    // shows up for the admin
    const list = await t.api().get('/api/appointments?paymentStatus=needs_manual_refund&limit=200').set(t.adminAuth);
    expect(list.body.data.map((a: { _id: string }) => a._id)).toContain(booked.id);

    // the admin can't accidentally re-confirm it into the taken slot
    expect((await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'confirmed' })).status).toBe(409);
  });

  it('a payment with the wrong amount is flagged, not confirmed', async () => {
    const booked = await bookPayNow();
    await capture('pay_wrong_amount', booked.payment.orderId, PRICE_PAISE - 100);
    expect(await doc(booked.id)).toMatchObject({ paymentStatus: 'needs_manual_refund', status: 'pending_payment' });
  });
});

describe('patient cancel + refund', () => {
  it('24h+ ahead: cancels and refunds in full, once', async () => {
    const booked = await bookAndPay('pay_cancel_1');
    const callsBefore = t.fakes.refundCalls.length;

    const res = await t.api().post(`/api/appointments/${booked.id}/cancel?token=${booked.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.refund).toBe('refunded');
    expect(t.fakes.refundCalls.slice(callsBefore)).toEqual([{ paymentId: 'pay_cancel_1', amount: PRICE_PAISE }]);

    const d = await doc(booked.id);
    expect(d).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded', amountRefunded: PRICE_PAISE });
    expect(d!.razorpayRefundId).toMatch(/^rfnd_/);
    expect(d!.refundLockedAt).toBeUndefined();
    expect(d!.isActiveSlot).toBeUndefined();
  });

  it('a second cancel does not refund again', async () => {
    const booked = await bookAndPay('pay_cancel_2');
    await t.api().post(`/api/appointments/${booked.id}/cancel?token=${booked.accessToken}`);
    const callsAfterFirst = t.fakes.refundCalls.length;
    const again = await t.api().post(`/api/appointments/${booked.id}/cancel?token=${booked.accessToken}`);
    expect(again.status).toBe(400);
    expect(t.fakes.refundCalls.length).toBe(callsAfterFirst);
  });

  it('concurrent cancels: exactly one wins and exactly one refund is issued', async () => {
    const booked = await bookAndPay('pay_cancel_race');
    t.fakes.refundDelayMs = 200;
    const callsBefore = t.fakes.refundCalls.length;
    const results = await Promise.all(Array.from({ length: 6 }, () => t.api().post(`/api/appointments/${booked.id}/cancel?token=${booked.accessToken}`)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(t.fakes.refundCalls.length - callsBefore).toBe(1);
  });

  it('inside 24h: rejected, still confirmed and paid, no refund', async () => {
    const booked = await bookAndPay('pay_inside_24h');
    const soon = new Date(Date.now() + 5 * 3600000);
    await t.models.Appointment.updateOne({ _id: booked.id }, { $set: { slotStart: soon, slotEnd: new Date(soon.getTime() + 1800000) } });
    const callsBefore = t.fakes.refundCalls.length;

    const res = await t.api().post(`/api/appointments/${booked.id}/cancel?token=${booked.accessToken}`);
    expect(res.status).toBe(400);
    expect(await doc(booked.id)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
    expect(t.fakes.refundCalls.length).toBe(callsBefore);
  });

  it('if Razorpay rejects the refund: still cancelled, flagged needs_manual_refund, lock released', async () => {
    const booked = await bookAndPay('pay_refund_fails');
    t.fakes.fail.refund = true;
    const res = await t.api().post(`/api/appointments/${booked.id}/cancel?token=${booked.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.refund).toBe('needs_manual_refund');
    const d = await doc(booked.id);
    expect(d).toMatchObject({ status: 'cancelled', paymentStatus: 'needs_manual_refund', amountRefunded: 0 });
    expect(d!.refundLockedAt).toBeUndefined();
    expect(d!.razorpayRefundId).toBeUndefined();
  });
});

describe('admin cancel / refund', () => {
  it('cancelling a paid booking requires an explicit refund decision', async () => {
    const booked = await bookAndPay('pay_admin_1');
    const res = await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'cancelled' });
    expect(res.status).toBe(400);
    expect((await doc(booked.id))!.status).toBe('confirmed');
  });

  it('cancel with refund: true refunds, even inside 24h', async () => {
    const booked = await bookAndPay('pay_admin_2');
    const soon = new Date(Date.now() + 3 * 3600000);
    await t.models.Appointment.updateOne({ _id: booked.id }, { $set: { slotStart: soon, slotEnd: new Date(soon.getTime() + 1800000) } });
    const res = await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'cancelled', refund: true });
    expect(res.status).toBe(200);
    expect(res.body.refund).toBe('refunded');
    expect(await doc(booked.id)).toMatchObject({ status: 'cancelled', cancelledBy: 'admin', paymentStatus: 'refunded' });
  });

  it('cancel with refund: false keeps the payment', async () => {
    const booked = await bookAndPay('pay_admin_3');
    const callsBefore = t.fakes.refundCalls.length;
    const res = await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'cancelled', refund: false });
    expect(res.status).toBe(200);
    expect(await doc(booked.id)).toMatchObject({ status: 'cancelled', paymentStatus: 'paid' });
    expect(t.fakes.refundCalls.length).toBe(callsBefore);
  });

  it('staff cannot issue refunds', async () => {
    const booked = await bookAndPay('pay_admin_4');
    expect((await t.api().put(`/api/appointments/${booked.id}`).set(t.staffAuth).send({ status: 'cancelled', refund: true })).status).toBe(403);
    expect((await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.staffAuth)).status).toBe(403);
    expect((await t.api().post(`/api/appointments/${booked.id}/refund`)).status).toBe(401);
    expect((await doc(booked.id))!.paymentStatus).toBe('paid');
  });

  it('POST /refund refunds once; a second call is 409', async () => {
    const booked = await bookAndPay('pay_admin_5');
    const first = await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth);
    expect(first.status).toBe(200);
    const second = await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth);
    expect(second.status).toBe(409);
    expect(t.fakes.refundCalls.filter((c) => c.paymentId === 'pay_admin_5')).toHaveLength(1);
  });

  it('concurrent admin refunds: one refund only', async () => {
    const booked = await bookAndPay('pay_admin_race');
    t.fakes.refundDelayMs = 200;
    const results = await Promise.all(Array.from({ length: 5 }, () => t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(t.fakes.refundCalls.filter((c) => c.paymentId === 'pay_admin_race')).toHaveLength(1);
  });

  it('refund on an unpaid booking is 409', async () => {
    const booked = await bookPayNow();
    expect((await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth)).status).toBe(409);
  });

  it('a failed refund can be retried by the admin once Razorpay recovers', async () => {
    const booked = await bookAndPay('pay_admin_retry');
    t.fakes.fail.refund = true;
    expect((await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth)).status).toBe(502);
    expect((await doc(booked.id))!.paymentStatus).toBe('needs_manual_refund');
    t.fakes.fail.refund = false;
    expect((await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth)).status).toBe(200);
    expect((await doc(booked.id))!.paymentStatus).toBe('refunded');
  });

  it('refund.failed webhook reverts our bookkeeping so the admin can retry', async () => {
    const booked = await bookAndPay('pay_refund_webhook');
    await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth);
    const refunded = await doc(booked.id);

    const res = await sendWebhook(
      webhookBody('refund.failed', { refund: { entity: { id: refunded!.razorpayRefundId, payment_id: 'pay_refund_webhook', amount: PRICE_PAISE } } })
    );
    expect(res.status).toBe(200);
    const d = await doc(booked.id);
    expect(d).toMatchObject({ paymentStatus: 'needs_manual_refund', amountRefunded: 0 });
    expect(d!.razorpayRefundId).toBeUndefined();
    expect((await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth)).status).toBe(200);
  });
});
