import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp, TestContext } from './helpers/testApp';

// Admin login and its brute-force limiter (5 failed attempts / 15 min / IP).
// Until now this limiter was only ever verified by hand with curl.

let t: TestContext;

beforeAll(async () => {
  t = await startTestApp({ paymentsEnabled: false });
});
afterAll(async () => {
  await t.close();
});

const login = (ip: string, password: string) =>
  t.apiFromIp(ip).post('/api/auth/login').send({ email: 'admin@example.com', password });

describe('admin login', () => {
  it('works with the right password and returns a token', async () => {
    const res = await login('198.51.100.1', 'correct-horse-battery');
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password', async () => {
    expect((await login('198.51.100.2', 'wrong')).status).toBe(401);
  });

  it('blocks an IP after 5 failed attempts, even for the right password', async () => {
    const ip = '198.51.100.3';
    for (let i = 0; i < 5; i++) {
      expect((await login(ip, 'wrong')).status).toBe(401);
    }
    expect((await login(ip, 'wrong')).status).toBe(429);
    expect((await login(ip, 'correct-horse-battery')).status).toBe(429);
  });

  it('the block is per IP', async () => {
    expect((await login('198.51.100.4', 'correct-horse-battery')).status).toBe(200);
  });

  it('successful logins do not count towards the limit', async () => {
    const ip = '198.51.100.5';
    for (let i = 0; i < 8; i++) {
      expect((await login(ip, 'correct-horse-battery')).status).toBe(200);
    }
  });

  it('admin routes reject missing, malformed and forged tokens', async () => {
    expect((await t.api().get('/api/appointments')).status).toBe(401);
    expect((await t.api().get('/api/appointments').set('Authorization', 'Bearer not-a-jwt')).status).toBe(401);
    const forged = (await import('jsonwebtoken')).default.sign({ id: '000000000000000000000000' }, 'some-other-secret-0123456789abcdef');
    expect((await t.api().get('/api/appointments').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });
});
