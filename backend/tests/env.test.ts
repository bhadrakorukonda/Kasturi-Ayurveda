import { beforeAll, describe, expect, it } from 'vitest';

// Startup rules from CLAUDE.md: the server must refuse to start on missing
// or dangerous configuration. Tested through the pure validateEnv().

const base: Record<string, string> = {
  NODE_ENV: 'production',
  JWT_SECRET: 'j'.repeat(40),
  MONGODB_URI: 'mongodb://localhost:27017/x',
  FRONTEND_URL: 'https://example.com',
  EMAIL_PROVIDER: 'resend',
  EMAIL_API_KEY: 're_x',
  EMAIL_FROM: 'Kasturi Ayurveda <bookings@example.com>',
  CRON_SECRET: 'c'.repeat(40),
  PAYMENTS_ENABLED: 'false',
};

const paymentsOn = {
  PAYMENTS_ENABLED: 'true',
  RAZORPAY_KEY_ID: 'rzp_test_x',
  RAZORPAY_KEY_SECRET: 's',
  RAZORPAY_WEBHOOK_SECRET: 'w',
  GOOGLE_CLIENT_ID: 'g',
  GOOGLE_CLIENT_SECRET: 'g',
  GOOGLE_REFRESH_TOKEN: 'g',
};

let validateEnv: typeof import('../src/config/env').validateEnv;

beforeAll(async () => {
  // Importing env.ts also validates process.env, so give it a valid one.
  Object.assign(process.env, base, { NODE_ENV: 'test', EMAIL_PROVIDER: 'log' });
  ({ validateEnv } = await import('../src/config/env'));
});

const errorsFor = (overrides: Record<string, string | undefined>) => {
  const result = validateEnv({ ...base, ...overrides });
  return result.ok ? [] : result.errors;
};

describe('always-required variables', () => {
  it('a complete production config is valid', () => {
    expect(errorsFor({})).toEqual([]);
  });

  it.each(['JWT_SECRET', 'MONGODB_URI', 'FRONTEND_URL', 'EMAIL_PROVIDER', 'EMAIL_FROM', 'CRON_SECRET'])('missing %s is fatal', (key) => {
    expect(errorsFor({ [key]: undefined }).join(' ')).toContain(key);
  });

  it('missing email API key is fatal for a real provider', () => {
    expect(errorsFor({ EMAIL_API_KEY: undefined }).join(' ')).toContain('EMAIL_API_KEY');
  });

  it('short secrets are rejected', () => {
    expect(errorsFor({ JWT_SECRET: 'short' }).join(' ')).toContain('JWT_SECRET');
    expect(errorsFor({ CRON_SECRET: 'short' }).join(' ')).toContain('CRON_SECRET');
  });

  it('a malformed EMAIL_FROM is rejected', () => {
    expect(errorsFor({ EMAIL_FROM: 'bookings@example.com' }).join(' ')).toContain('EMAIL_FROM');
  });

  it('EMAIL_PROVIDER=log is refused in production but allowed in development', () => {
    expect(errorsFor({ EMAIL_PROVIDER: 'log', EMAIL_API_KEY: undefined }).join(' ')).toContain('development only');
    expect(errorsFor({ EMAIL_PROVIDER: 'log', EMAIL_API_KEY: undefined, NODE_ENV: 'development' })).toEqual([]);
  });

  it('a typo in PAYMENTS_ENABLED is fatal rather than silently "off"', () => {
    expect(errorsFor({ PAYMENTS_ENABLED: 'TRUE' }).join(' ')).toContain('PAYMENTS_ENABLED');
  });
});

describe('PAYMENTS_ENABLED=true', () => {
  it('is valid with all Razorpay and Google variables', () => {
    expect(errorsFor(paymentsOn)).toEqual([]);
  });

  it.each(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'])(
    'requires %s',
    (key) => {
      expect(errorsFor({ ...paymentsOn, [key]: undefined }).join(' ')).toContain(key);
    }
  );

  it('Razorpay variables are NOT required while payments are off', () => {
    expect(errorsFor({ PAYMENTS_ENABLED: 'false' })).toEqual([]);
  });

  it('a live Razorpay key outside production is fatal', () => {
    expect(errorsFor({ ...paymentsOn, RAZORPAY_KEY_ID: 'rzp_live_x', NODE_ENV: 'development' }).join(' ')).toContain('rzp_live_');
    expect(errorsFor({ ...paymentsOn, RAZORPAY_KEY_ID: 'rzp_live_x', NODE_ENV: 'production' })).toEqual([]);
  });
});
