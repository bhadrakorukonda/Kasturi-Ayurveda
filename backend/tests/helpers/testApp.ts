import crypto from 'crypto';
import { inject } from 'vitest';
import supertest from 'supertest';
import type { Application } from 'express';
import { installFakeProviders, FakeProviders } from './fakeProviders';

// Builds a fully wired backend for one test file:
//  - fresh database on the shared in-memory MongoDB
//  - env set explicitly (nothing taken from a developer's .env)
//  - outbound HTTP replaced by FakeProviders
//  - seeded doctor (Mon-Sat 10-14 & 17-21 IST), settings, admin user

export const TEST_SECRETS = {
  JWT_SECRET: 'test-jwt-secret-0123456789abcdef0123456789',
  CRON_SECRET: 'test-cron-secret-0123456789abcdef012345678',
  RAZORPAY_KEY_ID: 'rzp_test_fakekey',
  RAZORPAY_KEY_SECRET: 'fake_key_secret',
  RAZORPAY_WEBHOOK_SECRET: 'fake_webhook_secret',
};

export const PRICE_PAISE = 50000;
export const CLINIC_EMAIL = 'clinic@example.com';

export interface TestContext {
  app: Application;
  fakes: FakeProviders;
  doctorId: string;
  adminAuth: { Authorization: string };
  staffAuth: { Authorization: string };
  models: {
    Appointment: typeof import('../../src/models/Appointment.model').default;
    Doctor: typeof import('../../src/models/Doctor.model').default;
    Settings: typeof import('../../src/models/Settings.model').default;
  };
  /** supertest request with a random client IP, so per-IP rate limits don't interfere */
  api: () => { get: (u: string) => supertest.Test; post: (u: string) => supertest.Test; put: (u: string) => supertest.Test };
  /** supertest request from a fixed IP (for rate-limit tests) */
  apiFromIp: (ip: string) => { get: (u: string) => supertest.Test; post: (u: string) => supertest.Test };
  /** next free bookable slot (ISO), 2+ days ahead, so outside the 24h refund window */
  nextSlot: () => Promise<string>;
  close: () => Promise<void>;
}

const randomIp = () => `10.${crypto.randomInt(256)}.${crypto.randomInt(256)}.${crypto.randomInt(1, 255)}`;

export const startTestApp = async (options: { paymentsEnabled: boolean }): Promise<TestContext> => {
  const dbName = `test_${crypto.randomBytes(6).toString('hex')}`;
  const base = inject('mongoUri').replace(/\/?$/, '/');

  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: `${base}${dbName}`,
    FRONTEND_URL: 'http://frontend.test',
    JWT_SECRET: TEST_SECRETS.JWT_SECRET,
    JWT_EXPIRE: '1h',
    EMAIL_PROVIDER: 'resend',
    EMAIL_API_KEY: 're_fake',
    EMAIL_FROM: 'Kasturi Ayurveda <bookings@example.com>',
    CLINIC_NOTIFY_EMAIL: CLINIC_EMAIL,
    CRON_SECRET: TEST_SECRETS.CRON_SECRET,
    PAYMENTS_ENABLED: String(options.paymentsEnabled),
    RAZORPAY_KEY_ID: TEST_SECRETS.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: TEST_SECRETS.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: TEST_SECRETS.RAZORPAY_WEBHOOK_SECRET,
    GOOGLE_CLIENT_ID: 'fake-client-id',
    GOOGLE_CLIENT_SECRET: 'fake-client-secret',
    GOOGLE_REFRESH_TOKEN: 'fake-refresh-token',
    GOOGLE_CALENDAR_ID: 'primary',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100000',
  });

  const fakes = installFakeProviders();

  const mongoose = (await import('mongoose')).default;
  const { createApp } = await import('../../src/app');
  const Appointment = (await import('../../src/models/Appointment.model')).default;
  const Doctor = (await import('../../src/models/Doctor.model')).default;
  const Settings = (await import('../../src/models/Settings.model')).default;
  const User = (await import('../../src/models/User.model')).default;
  const jwt = (await import('jsonwebtoken')).default;

  await mongoose.connect(process.env.MONGODB_URI as string);
  // Build indexes up front: the partial unique index IS the double-booking guard.
  await Promise.all([Appointment.syncIndexes(), Doctor.syncIndexes(), Settings.syncIndexes(), User.syncIndexes()]);

  await Settings.create({
    consultationPrice: { INR: PRICE_PAISE, USD: 5000 },
    usdEnabled: false,
    minNoticeMins: 120,
    maxAdvanceDays: 30,
    holdMinutes: 10,
    refundWindowHours: 24,
  });
  const doctor = await Doctor.create({
    name: 'Dr. Test',
    specialization: 'General Ayurvedic Physician',
    isActive: true,
    slotDurationMins: 30,
    weeklySchedule: { workingDays: [1, 2, 3, 4, 5, 6], windows: [{ start: '10:00', end: '14:00' }, { start: '17:00', end: '21:00' }] },
    blockedDates: [],
    supportsOnline: true,
  });
  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'correct-horse-battery', role: 'admin' });
  const staff = await User.create({ name: 'Staff', email: 'staff@example.com', password: 'correct-horse-battery', role: 'staff' });
  const sign = (id: unknown) => `Bearer ${jwt.sign({ id: String(id) }, TEST_SECRETS.JWT_SECRET, { expiresIn: '1h' })}`;

  const app = createApp();
  const doctorId = String(doctor._id);

  const withIp = (ip: string) => ({
    get: (u: string) => supertest(app).get(u).set('X-Forwarded-For', ip),
    post: (u: string) => supertest(app).post(u).set('X-Forwarded-For', ip),
    put: (u: string) => supertest(app).put(u).set('X-Forwarded-For', ip),
  });

  // Slot pool: dates 2..30 days ahead, refilled from the real availability endpoint.
  let pool: string[] = [];
  let dayOffset = 2;
  const nextSlot = async (): Promise<string> => {
    while (pool.length === 0) {
      if (dayOffset > 29) throw new Error('ran out of test slots');
      const date = new Date(Date.now() + dayOffset * 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
      dayOffset++;
      const res = await withIp(randomIp()).get(`/api/availability?doctorId=${doctorId}&date=${date}`);
      pool = res.body?.data?.slots ?? [];
    }
    return pool.shift() as string;
  };

  return {
    app,
    fakes,
    doctorId,
    adminAuth: { Authorization: sign(admin._id) },
    staffAuth: { Authorization: sign(staff._id) },
    models: { Appointment, Doctor, Settings },
    api: () => withIp(randomIp()),
    apiFromIp: (ip: string) => withIp(ip),
    nextSlot,
    close: async () => {
      // Let any after-response background work finish before tearing down.
      await new Promise((r) => setTimeout(r, 200));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
};

// ---- small shared helpers -------------------------------------------------

export const patient = (overrides: Record<string, unknown> = {}) => ({
  name: 'Test Patient',
  phone: '9123456780',
  email: 'patient@example.com',
  age: 77,
  symptoms: 'SECRET-SYMPTOM-TEXT',
  ...overrides,
});

export const signWebhook = (rawBody: string): string =>
  crypto.createHmac('sha256', TEST_SECRETS.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');

export const webhookBody = (event: string, payload: Record<string, unknown>): string =>
  JSON.stringify({ entity: 'event', event, payload });

export const capturedPayload = (paymentId: string, orderId: string, amount = PRICE_PAISE) => ({
  payment: { entity: { id: paymentId, order_id: orderId, amount, currency: 'INR', status: 'captured' } },
});

/** Poll until the condition holds (for after-response background work). */
export const waitFor = async (condition: () => Promise<boolean> | boolean, timeoutMs = 5000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('waitFor: condition not met in time');
};

/** Give fire-and-forget work a moment, for asserting something did NOT happen. */
export const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));
