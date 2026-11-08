import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { patient, PRICE_PAISE, settle, startTestApp, TestContext } from './helpers/testApp';

// Bookings with PAYMENTS_ENABLED=false (how production runs today).

let t: TestContext;

beforeAll(async () => {
  t = await startTestApp({ paymentsEnabled: false });
});
afterAll(async () => {
  await t.close();
});

const book = (body: Record<string, unknown>) =>
  t.api().post('/api/appointments').send({ doctorId: t.doctorId, mode: 'in_person', paymentMode: 'pay_at_clinic', patient: patient(), ...body });

describe('pay-at-clinic booking', () => {
  it('creates a confirmed, unpaid booking at the server price', async () => {
    const slotStart = await t.nextSlot();
    const res = await book({ slotStart });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'confirmed', paymentMode: 'pay_at_clinic', amountDue: PRICE_PAISE });
    expect(res.body.data.accessToken).toMatch(/^[0-9a-f]{64}$/);

    const doc = await t.models.Appointment.findById(res.body.data.id).lean();
    expect(doc).toMatchObject({ status: 'confirmed', paymentStatus: 'unpaid', isActiveSlot: true, amountDue: PRICE_PAISE });
    expect(new Date(doc!.slotEnd).getTime() - new Date(doc!.slotStart).getTime()).toBe(30 * 60 * 1000);
    // Only the hash is stored, never the raw token.
    expect(JSON.stringify(doc)).not.toContain(res.body.data.accessToken);
  });

  it('two concurrent bookings for the same slot: exactly one succeeds', async () => {
    const slotStart = await t.nextSlot();
    const results = await Promise.all(Array.from({ length: 10 }, () => book({ slotStart })));
    const statuses = results.map((r) => r.status).sort();

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(await t.models.Appointment.countDocuments({ slotStart: new Date(slotStart), isActiveSlot: true })).toBe(1);
  });

  it('a taken slot disappears from availability and is freed again on cancel', async () => {
    const slotStart = await t.nextSlot();
    const date = new Date(new Date(slotStart).getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
    const res = await book({ slotStart });

    let avail = await t.api().get(`/api/availability?doctorId=${t.doctorId}&date=${date}`);
    expect(avail.body.data.slots).not.toContain(slotStart);

    await t.api().put(`/api/appointments/${res.body.data.id}`).set(t.adminAuth).send({ status: 'cancelled' });
    avail = await t.api().get(`/api/availability?doctorId=${t.doctorId}&date=${date}`);
    expect(avail.body.data.slots).toContain(slotStart);
  });
});

describe('slot validation is enforced by the server', () => {
  const istDate = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
  const istTime = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`).toISOString();

  it('rejects a slot outside working hours', async () => {
    const date = istDate(await t.nextSlot());
    const res = await book({ slotStart: istTime(date, '03:00') });
    expect(res.status).toBe(400);
  });

  it('rejects a time that is not on the 30-minute grid', async () => {
    const date = istDate(await t.nextSlot());
    const res = await book({ slotStart: istTime(date, '10:10') });
    expect(res.status).toBe(400);
  });

  it('rejects a non-working day (Sunday)', async () => {
    const d = new Date(Date.now() + 3 * 86400000);
    while (new Date(d.getTime() + 5.5 * 3600000).getUTCDay() !== 0) d.setTime(d.getTime() + 86400000);
    const res = await book({ slotStart: istTime(istDate(d.toISOString()), '10:00') });
    expect(res.status).toBe(400);
  });

  it('rejects a slot on a blocked date', async () => {
    const slotStart = await t.nextSlot();
    const date = istDate(slotStart);
    await t.models.Doctor.updateOne({ _id: t.doctorId }, { $set: { blockedDates: [new Date(`${date}T06:30:00Z`)] } });
    try {
      const res = await book({ slotStart });
      expect(res.status).toBe(400);
    } finally {
      await t.models.Doctor.updateOne({ _id: t.doctorId }, { $set: { blockedDates: [] } });
    }
  });

  it('rejects a slot inside the minimum notice period', async () => {
    const slotStart = await t.nextSlot(); // 2+ days ahead
    await t.models.Settings.updateOne({}, { $set: { minNoticeMins: 10 * 24 * 60 } });
    try {
      expect((await book({ slotStart })).status).toBe(400);
    } finally {
      await t.models.Settings.updateOne({}, { $set: { minNoticeMins: 120 } });
    }
  });

  it('rejects a slot beyond the maximum advance window', async () => {
    const slotStart = await t.nextSlot();
    await t.models.Settings.updateOne({}, { $set: { maxAdvanceDays: 1 } });
    try {
      expect((await book({ slotStart })).status).toBe(400);
    } finally {
      await t.models.Settings.updateOne({}, { $set: { maxAdvanceDays: 30 } });
    }
  });
});

describe('client-supplied price / status / amounts are never trusted', () => {
  it.each([
    ['amountDue', { amountDue: 1 }],
    ['status', { status: 'completed' }],
    ['paymentStatus', { paymentStatus: 'paid' }],
    ['amountPaid', { amountPaid: 50000 }],
    ['currency', { currency: 'USD' }],
  ])('rejects a body containing %s and creates nothing', async (_name, extra) => {
    const slotStart = await t.nextSlot();
    const res = await book({ slotStart, ...extra });
    expect(res.status).toBe(400);
    expect(await t.models.Appointment.countDocuments({ slotStart: new Date(slotStart) })).toBe(0);
  });

  it('price comes from Settings, even after the admin changes it', async () => {
    await t.models.Settings.updateOne({}, { $set: { 'consultationPrice.INR': 73300 } });
    try {
      const res = await book({ slotStart: await t.nextSlot() });
      expect(res.body.data.amountDue).toBe(73300);
    } finally {
      await t.models.Settings.updateOne({}, { $set: { 'consultationPrice.INR': PRICE_PAISE } });
    }
  });
});

describe('with PAYMENTS_ENABLED=false', () => {
  it('config hides online mode and payments', async () => {
    const res = await t.api().get('/api/config');
    expect(res.body.data.modes).toEqual(['in_person']);
    expect(res.body.data.paymentsEnabled).toBe(false);
  });

  it('rejects online mode', async () => {
    const res = await book({ slotStart: await t.nextSlot(), mode: 'online', paymentMode: 'pay_now', consentAccepted: true });
    expect(res.status).toBe(400);
  });

  it('rejects pay_now for in-person', async () => {
    const res = await book({ slotStart: await t.nextSlot(), paymentMode: 'pay_now' });
    expect(res.status).toBe(400);
  });

  it('payment webhook route does not exist', async () => {
    const res = await t.api().post('/api/payments/webhook').set('Content-Type', 'application/json').send('{}');
    expect(res.status).toBe(404);
  });

  it('admin refund route returns 404', async () => {
    const created = await book({ slotStart: await t.nextSlot() });
    const res = await t.api().post(`/api/appointments/${created.body.data.id}/refund`).set(t.adminAuth);
    expect(res.status).toBe(404);
  });

  it('makes no Razorpay calls at all', async () => {
    await settle();
    expect(t.fakes.orders).toHaveLength(0);
    expect(t.fakes.refundCalls).toHaveLength(0);
  });
});

describe('patient token page', () => {
  it('works with the right token and returns only patient-safe fields', async () => {
    const created = (await book({ slotStart: await t.nextSlot() })).body.data;
    const res = await t.api().get(`/api/appointments/${created.id}?token=${created.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: created.id, status: 'confirmed', cancellable: true });
    const body = JSON.stringify(res.body);
    for (const field of ['9123456780', 'patient@example.com', 'SECRET-SYMPTOM-TEXT', 'accessTokenHash']) {
      expect(body).not.toContain(field);
    }
  });

  it('rejects a wrong token', async () => {
    const created = (await book({ slotStart: await t.nextSlot() })).body.data;
    const wrong = created.accessToken.replace(/^./, (c: string) => (c === 'a' ? 'b' : 'a'));
    expect((await t.api().get(`/api/appointments/${created.id}?token=${wrong}`)).status).toBe(403);
    expect((await t.api().get(`/api/appointments/${created.id}?token=`)).status).toBe(403);
  });

  it("rejects another booking's token", async () => {
    const a = (await book({ slotStart: await t.nextSlot() })).body.data;
    const b = (await book({ slotStart: await t.nextSlot() })).body.data;
    expect((await t.api().get(`/api/appointments/${a.id}?token=${b.accessToken}`)).status).toBe(403);
  });

  it('a missing token falls through to admin auth and is rejected', async () => {
    const created = (await book({ slotStart: await t.nextSlot() })).body.data;
    expect((await t.api().get(`/api/appointments/${created.id}`)).status).toBe(401);
  });

  it('cancel requires a valid token', async () => {
    const created = (await book({ slotStart: await t.nextSlot() })).body.data;
    expect((await t.api().post(`/api/appointments/${created.id}/cancel`)).status).toBe(403);
    expect((await t.api().post(`/api/appointments/${created.id}/cancel?token=${'0'.repeat(64)}`)).status).toBe(403);
    expect((await t.models.Appointment.findById(created.id))!.status).toBe('confirmed');
  });

  it('is rate-limited per IP (30 requests / 15 min)', async () => {
    const created = (await book({ slotStart: await t.nextSlot() })).body.data;
    const client = t.apiFromIp('203.0.113.7');
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      statuses.push((await client.get(`/api/appointments/${created.id}?token=${created.accessToken}`)).status);
    }
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});

describe('pay-at-clinic cancel', () => {
  it('patient can cancel 24h+ ahead; slot is freed; no refund attempted', async () => {
    const created = (await book({ slotStart: await t.nextSlot() })).body.data;
    const res = await t.api().post(`/api/appointments/${created.id}/cancel?token=${created.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refund).toBe('none');
    const doc = await t.models.Appointment.findById(created.id).lean();
    expect(doc).toMatchObject({ status: 'cancelled', cancelledBy: 'patient' });
    expect(doc!.isActiveSlot).toBeUndefined();
    expect(t.fakes.refundCalls).toHaveLength(0);
  });

  it('patient cannot cancel inside 24h', async () => {
    const created = (await book({ slotStart: await t.nextSlot() })).body.data;
    const soon = new Date(Date.now() + 5 * 3600000);
    await t.models.Appointment.updateOne({ _id: created.id }, { $set: { slotStart: soon, slotEnd: new Date(soon.getTime() + 1800000) } });

    const view = await t.api().get(`/api/appointments/${created.id}?token=${created.accessToken}`);
    expect(view.body.data.cancellable).toBe(false);
    const res = await t.api().post(`/api/appointments/${created.id}/cancel?token=${created.accessToken}`);
    expect(res.status).toBe(400);
    expect((await t.models.Appointment.findById(created.id))!.status).toBe('confirmed');
  });
});
