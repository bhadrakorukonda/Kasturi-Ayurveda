import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  capturedPayload,
  CLINIC_EMAIL,
  patient,
  settle,
  signWebhook,
  startTestApp,
  TestContext,
  TEST_SECRETS,
  waitFor,
  webhookBody,
} from './helpers/testApp';
import type { SentEmail } from './helpers/fakeProviders';

// Emails, Google Meet links, reminders and the scheduled-jobs endpoint.

let t: TestContext;

beforeAll(async () => {
  t = await startTestApp({ paymentsEnabled: true });
});
afterAll(async () => {
  await t.close();
});
beforeEach(() => {
  t.fakes.fail = { email: false, google: false, refund: false, order: false };
});

const SENSITIVE = ['SECRET-SYMPTOM-TEXT', '9123456780', 'Age:'];
const expectNoLeaks = (emails: SentEmail[]) => {
  for (const email of emails) {
    for (const s of SENSITIVE) {
      expect(email.html, `${email.tag} html leaks "${s}"`).not.toContain(s);
      expect(email.text, `${email.tag} text leaks "${s}"`).not.toContain(s);
    }
  }
};
const tokenIn = (email: SentEmail) => email.text.match(/\/booking\/[0-9a-f]{24}\?token=([0-9a-f]{64})/)?.[1];
const doc = (id: string) => t.models.Appointment.findById(id).lean();
const runJobs = (secret: string | null = TEST_SECRETS.CRON_SECRET) => {
  const req = t.api().post('/api/jobs/run');
  return secret === null ? req : req.set('Authorization', `Bearer ${secret}`);
};
const confirmationsFor = (id: string) => t.fakes.emailsFor(id).filter((e) => e.tag === `confirmation:${id}`);

const bookClinic = async (p = patient()) => {
  const res = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'in_person', paymentMode: 'pay_at_clinic', patient: p });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; accessToken: string };
};

const bookOnlineAndPay = async (paymentId: string) => {
  const res = await t
    .api()
    .post('/api/appointments')
    .send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'online', paymentMode: 'pay_now', consentAccepted: true, patient: patient() });
  const raw = webhookBody('payment.captured', capturedPayload(paymentId, res.body.data.payment.orderId));
  await t.api().post('/api/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', signWebhook(raw)).send(raw);
  return res.body.data as { id: string; accessToken: string };
};

const moveSlot = async (id: string, hoursFromNow: number, bookedDaysAgo?: number) => {
  const start = new Date(Date.now() + hoursFromNow * 3600000);
  start.setUTCSeconds(0, 0);
  const set: Record<string, Date> = { slotStart: start, slotEnd: new Date(start.getTime() + 1800000) };
  if (bookedDaysAgo !== undefined) set.createdAt = new Date(Date.now() - bookedDaysAgo * 86400000);
  // bypass mongoose timestamps so createdAt really changes
  await t.models.Appointment.collection.updateOne({ _id: new (await import('mongoose')).default.Types.ObjectId(id) }, { $set: set });
};

describe('scheduled jobs endpoint', () => {
  it('rejects a missing or wrong secret', async () => {
    expect((await runJobs(null)).status).toBe(401);
    expect((await runJobs('x'.repeat(48))).status).toBe(401);
  });

  it('runs with the right secret and reports counts', async () => {
    const res = await runJobs();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ confirmationsSent: expect.any(Number), meetLinksCreated: expect.any(Number), remindersSent: expect.any(Number) });
  });
});

describe('booking confirmation email', () => {
  it('pay-at-clinic: patient + clinic emails, minimal PII, original token in the link', async () => {
    const booked = await bookClinic(patient({ name: 'Asha <b>Rao</b>' }));
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await waitFor(() => t.fakes.emailsFor(booked.id).some((e) => e.tag.startsWith('clinic-booking')));

    const conf = confirmationsFor(booked.id)[0];
    expect(conf.to).toEqual(['patient@example.com']);
    expect(conf.from).toBe('Kasturi Ayurveda <bookings@example.com>');
    expect(tokenIn(conf)).toBe(booked.accessToken);
    expect(conf.html).toContain('Asha &lt;b&gt;Rao&lt;/b&gt;');
    expect(conf.html).not.toContain('<b>Rao</b>');

    const clinic = t.fakes.emailsFor(booked.id).find((e) => e.tag.startsWith('clinic-booking'))!;
    expect(clinic.to).toEqual([CLINIC_EMAIL]);
    expect(clinic.html).not.toContain('Asha');
    expectNoLeaks(t.fakes.emailsFor(booked.id));

    const d = await doc(booked.id);
    expect(d!.confirmationPending).toBeUndefined();
    expect(d!.notifyLockedAt).toBeUndefined();
  });

  it('no patient email address: only the clinic is notified', async () => {
    const booked = await bookClinic(patient({ email: undefined }));
    await waitFor(async () => !(await doc(booked.id))!.confirmationPending);
    expect(t.fakes.emailsFor(booked.id).map((e) => e.tag)).toEqual([`clinic-booking:${booked.id}`]);
  });

  it('email outage: booking still succeeds, the job retries, exactly one email even with concurrent runs', async () => {
    t.fakes.fail.email = true;
    const booked = await bookClinic();
    await settle();
    let d = await doc(booked.id);
    expect(d).toMatchObject({ status: 'confirmed', confirmationPending: true });
    expect(d!.notifyLockedAt).toBeUndefined();

    t.fakes.fail.email = false;
    const runs = await Promise.all([runJobs(), runJobs(), runJobs()]);
    expect(runs.every((r) => r.status === 200)).toBe(true);
    expect(confirmationsFor(booked.id)).toHaveLength(1);
    d = await doc(booked.id);
    expect(d!.confirmationPending).toBeUndefined();
  });
});

describe('online consultations: Google Meet', () => {
  it('payment confirmation creates the Meet event and emails the link with a fresh token', async () => {
    const booked = await bookOnlineAndPay('pay_meet_1');
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    const d = await doc(booked.id);

    const insert = t.fakes.calendarOps.find((o) => o.op === 'insert' && o.id === booked.id)!;
    expect(insert.query).toContain('conferenceDataVersion=1');
    expect(insert.query).toContain('sendUpdates=none');
    expect(insert.body).not.toHaveProperty('attendees');
    expect(JSON.stringify(insert.body)).not.toMatch(/9123456780|patient@example\.com|SECRET-SYMPTOM/);
    expect(d).toMatchObject({ googleEventId: booked.id, meetLink: expect.stringMatching(/^https:\/\/meet\.google\.com\//) });

    const conf = confirmationsFor(booked.id)[0];
    expect(conf.html).toContain(d!.meetLink);
    const fresh = tokenIn(conf)!;
    expect(fresh).toBeTruthy();
    expect(fresh).not.toBe(booked.accessToken);
    expect((await t.api().get(`/api/appointments/${booked.id}?token=${fresh}`)).status).toBe(200);
    expect((await t.api().get(`/api/appointments/${booked.id}?token=${booked.accessToken}`)).status).toBe(200);
    expect(JSON.stringify(d)).not.toContain(fresh);
  });

  it('Google outage: confirmation still sent ("link will follow"); job creates the link later and emails it once', async () => {
    t.fakes.fail.google = true;
    const booked = await bookOnlineAndPay('pay_meet_2');
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    expect(confirmationsFor(booked.id)[0].text).toMatch(/isn.t ready yet/);
    expect((await doc(booked.id))!.meetLink).toBeUndefined();

    expect((await runJobs()).body.data.meetLinksCreated).toBe(0);
    t.fakes.fail.google = false;
    expect((await runJobs()).body.data.meetLinksCreated).toBe(1);

    const d = await doc(booked.id);
    expect(d!.meetLink).toBeTruthy();
    const ready = t.fakes.emailsFor(booked.id).filter((e) => e.tag === `meet-link:${booked.id}`);
    expect(ready).toHaveLength(1);
    expect(ready[0].html).toContain(d!.meetLink);

    await runJobs();
    expect(t.fakes.emailsFor(booked.id).filter((e) => e.tag === `meet-link:${booked.id}`)).toHaveLength(1);
  });

  it('cancelling deletes the calendar event; re-confirming revives it', async () => {
    const booked = await bookOnlineAndPay('pay_meet_3');
    await waitFor(() => confirmationsFor(booked.id).length === 1);

    await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'cancelled', refund: false });
    await waitFor(() => t.fakes.calendarOps.some((o) => o.op === 'delete' && o.id === booked.id));
    await waitFor(async () => !(await doc(booked.id))!.meetLink);

    expect((await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'confirmed' })).status).toBe(200);
    await runJobs();
    expect((await doc(booked.id))!.meetLink).toBeTruthy();
    expect(t.fakes.calendarOps.some((o) => o.op === 'patch' && o.id === booked.id)).toBe(true);
  });
});

describe('24h reminders', () => {
  it('sent once for a booking made more than 24h ahead, with a working fresh link', async () => {
    const booked = await bookClinic();
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await moveSlot(booked.id, 20, 3);

    await runJobs();
    const reminders = t.fakes.emailsFor(booked.id).filter((e) => e.tag === `reminder:${booked.id}`);
    expect(reminders).toHaveLength(1);
    expectNoLeaks(reminders);
    expect((await t.api().get(`/api/appointments/${booked.id}?token=${tokenIn(reminders[0])}`)).status).toBe(200);

    await Promise.all([runJobs(), runJobs()]);
    expect(t.fakes.emailsFor(booked.id).filter((e) => e.tag === `reminder:${booked.id}`)).toHaveLength(1);
  });

  it('not sent for a booking made less than 24h before its slot', async () => {
    const booked = await bookClinic();
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await moveSlot(booked.id, 21); // createdAt stays "now"
    await runJobs();
    expect(t.fakes.emailsFor(booked.id).some((e) => e.tag.startsWith('reminder'))).toBe(false);
  });

  it('not sent for cancelled bookings', async () => {
    const booked = await bookClinic();
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'cancelled' });
    await moveSlot(booked.id, 20, 3);
    await runJobs();
    expect(t.fakes.emailsFor(booked.id).some((e) => e.tag.startsWith('reminder'))).toBe(false);
  });

  it('a failed reminder is retried on the next run', async () => {
    const booked = await bookClinic();
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await moveSlot(booked.id, 19, 3);

    t.fakes.fail.email = true;
    await runJobs();
    expect((await doc(booked.id))!.reminderSentAt).toBeUndefined();
    t.fakes.fail.email = false;
    await runJobs();
    expect(t.fakes.emailsFor(booked.id).filter((e) => e.tag.startsWith('reminder'))).toHaveLength(1);
  });
});

describe('cancellation and refund emails', () => {
  it('patient cancel of a paid booking: email mentions the refund', async () => {
    const booked = await bookOnlineAndPay('pay_mail_1');
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await t.api().post(`/api/appointments/${booked.id}/cancel?token=${booked.accessToken}`);
    await waitFor(() => t.fakes.emailsFor(booked.id).some((e) => e.tag === `cancellation:${booked.id}`));
    const email = t.fakes.emailsFor(booked.id).find((e) => e.tag === `cancellation:${booked.id}`)!;
    expect(email.text).toMatch(/full refund of ₹500\.00/);
    expectNoLeaks([email]);
  });

  it('admin cancel: "cancelled by the clinic", no refund wording for pay-at-clinic', async () => {
    const booked = await bookClinic();
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await t.api().put(`/api/appointments/${booked.id}`).set(t.adminAuth).send({ status: 'cancelled' });
    await waitFor(() => t.fakes.emailsFor(booked.id).some((e) => e.tag === `cancellation:${booked.id}`));
    const email = t.fakes.emailsFor(booked.id).find((e) => e.tag === `cancellation:${booked.id}`)!;
    expect(email.text).toMatch(/cancelled by the clinic/);
    expect(email.text).not.toMatch(/refund/i);
  });

  it('an unconfirmed (unpaid) hold that is cancelled sends nothing', async () => {
    const res = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'in_person', paymentMode: 'pay_now', patient: patient() });
    await t.api().put(`/api/appointments/${res.body.data.id}`).set(t.adminAuth).send({ status: 'cancelled' });
    await settle();
    expect(t.fakes.emailsFor(res.body.data.id)).toHaveLength(0);
  });

  it('admin refund sends a refund notice', async () => {
    const booked = await bookOnlineAndPay('pay_mail_2');
    await waitFor(() => confirmationsFor(booked.id).length === 1);
    await t.api().post(`/api/appointments/${booked.id}/refund`).set(t.adminAuth);
    await waitFor(() => t.fakes.emailsFor(booked.id).some((e) => e.tag.startsWith(`refund:${booked.id}`)));
  });
});

describe('contact form', () => {
  it('acknowledges the sender and notifies the clinic without echoing the message', async () => {
    const res = await t
      .api()
      .post('/api/contact')
      .send({ name: 'Ravi', email: 'ravi@example.com', phone: '9123456780', subject: 'Knee pain', message: 'I have SECRET-SYMPTOM-TEXT for weeks' });
    expect(res.status).toBe(201);
    const mails = t.fakes.emails.filter((e) => e.tag.startsWith('contact'));
    expect(mails.find((e) => e.tag.startsWith('contact-ack'))!.to).toEqual(['ravi@example.com']);
    expect(mails.find((e) => e.tag.startsWith('contact-clinic'))!.to).toEqual([CLINIC_EMAIL]);
    expectNoLeaks(mails);
    expect(mails.some((e) => e.text.includes('Knee pain'))).toBe(false);
  });
});

describe('across everything above', () => {
  it('no email ever contained symptoms, phone or age', () => {
    expect(t.fakes.emails.length).toBeGreaterThan(10);
    expectNoLeaks(t.fakes.emails);
  });
});
