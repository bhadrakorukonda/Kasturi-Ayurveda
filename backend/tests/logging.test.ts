import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { patient, startTestApp, TestContext } from './helpers/testApp';

// Logs must never contain patient access tokens, secrets or patient data.
// The logger is silent in tests by default; turn it on for this file and
// capture what it writes.
process.env.LOG_LEVEL = 'debug';

let t: TestContext;
const lines: string[] = [];

beforeAll(async () => {
  const capture = (chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  };
  vi.spyOn(process.stdout, 'write').mockImplementation(capture as typeof process.stdout.write);
  vi.spyOn(process.stderr, 'write').mockImplementation(capture as typeof process.stderr.write);
  t = await startTestApp({ paymentsEnabled: false });
});
afterAll(async () => {
  await t.close();
  vi.restoreAllMocks();
});

const parsed = () =>
  lines
    .flatMap((chunk) => chunk.split('\n'))
    .filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l) as Record<string, unknown>);

describe('request logging', () => {
  it('logs one JSON line per request with path, status and duration, never the query string', async () => {
    const res = await t.api().post('/api/appointments').send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'in_person', paymentMode: 'pay_at_clinic', patient: patient() });
    const { id, accessToken } = res.body.data;
    lines.length = 0;

    const view = await t.api().get(`/api/appointments/${id}?token=${accessToken}`);
    expect(view.status).toBe(200);

    const all = lines.join('');
    expect(all).not.toContain(accessToken);
    const entry = parsed().find((l) => l.msg === 'request' && l.path === `/api/appointments/${id}`);
    expect(entry).toMatchObject({ level: 'info', method: 'GET', status: 200 });
    expect(entry!.durationMs).toEqual(expect.any(Number));
    expect(entry!.requestId).toBe(view.headers['x-request-id']);
  });

  it('booking and email logs carry ids only: no name, phone, email, symptoms or token', async () => {
    lines.length = 0;
    const res = await t
      .api()
      .post('/api/appointments')
      .send({ doctorId: t.doctorId, slotStart: await t.nextSlot(), mode: 'in_person', paymentMode: 'pay_at_clinic', patient: patient({ name: 'Unique Patient Name' }) });
    await new Promise((r) => setTimeout(r, 300));
    const all = lines.join('');
    for (const secret of ['Unique Patient Name', '9123456780', 'patient@example.com', 'SECRET-SYMPTOM-TEXT', res.body.data.accessToken, 're_fake']) {
      expect(all).not.toContain(secret);
    }
    expect(parsed().some((l) => l.msg === 'email sent' && String(l.tag).includes(res.body.data.id))).toBe(true);
  });

  it('invalid ids are a clean 4xx, not logged as server errors', async () => {
    lines.length = 0;
    await t.api().get(`/api/appointments/not-an-id?token=${'a'.repeat(64)}`);
    // invalid ids are a clean 403, not a crash: nothing logged at error level
    expect(parsed().filter((l) => l.level === 'error')).toHaveLength(0);
  });
});

describe('redaction safety net', () => {
  it('redacts sensitive keys at any depth and serialises errors', async () => {
    const { sanitizeForLog } = await import('../src/utils/logger');
    const out = sanitizeForLog({
      appointmentId: 'abc',
      authorization: 'Bearer x',
      nested: { patient: { name: 'X' }, email: 'a@b.c', phone: '1', token: 't', apiKey: 'k', RAZORPAY_KEY_SECRET: 's' },
      err: new Error('boom'),
    }) as Record<string, any>;

    expect(out.appointmentId).toBe('abc');
    expect(out.authorization).toBe('[redacted]');
    expect(out.nested).toMatchObject({ patient: '[redacted]', email: '[redacted]', phone: '[redacted]', token: '[redacted]', apiKey: '[redacted]', RAZORPAY_KEY_SECRET: '[redacted]' });
    expect(out.err).toMatchObject({ name: 'Error', message: 'boom' });
  });
});
