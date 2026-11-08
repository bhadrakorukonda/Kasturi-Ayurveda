import z from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

// Ensure environment variables are loaded
dotenv.config({ quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Read directly by utils/logger.ts; listed here so a typo fails startup.
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),
  PORT: z.string().default('5000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
  // Transactional email. 'log' is a dev/test-only stand-in that sends
  // nothing (refused in production, see parseEnv).
  EMAIL_PROVIDER: z.enum(['resend', 'brevo', 'log']),
  EMAIL_API_KEY: z.string().optional(),
  // "Display Name <address@domain>"; must be a sender verified with the provider.
  EMAIL_FROM: z
    .string()
    .regex(/^[^<>]+<[^<>\s@]+@[^<>\s@]+>$/, 'EMAIL_FROM must look like: Kasturi Ayurveda <bookings@example.com>'),
  // Clinic inbox for "new booking / new message" notifications. Optional.
  CLINIC_NOTIFY_EMAIL: z.string().email().optional(),
  // Shared secret the scheduler (GitHub Actions) sends to POST /api/jobs/run.
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters long'),
  // Google Calendar (Meet links for online consultations). Required only
  // when PAYMENTS_ENABLED=true, since online mode is impossible otherwise.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default('primary'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  PAYMENTS_ENABLED: z.enum(['true', 'false']).default('false'),
  // Required only when PAYMENTS_ENABLED=true (enforced in parseEnv below).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Pure validation (no exiting, no logging) so the startup rules can be
// unit-tested. Returns either the parsed env or a list of problems.
export const validateEnv = (
  source: Record<string, string | undefined>
): { ok: true; env: Env; warnings: string[] } | { ok: false; errors: string[] } => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  }

  const parsed = result.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (parsed.EMAIL_PROVIDER === 'log') {
    if (parsed.NODE_ENV === 'production') {
      errors.push('EMAIL_PROVIDER=log is for development only. Set resend or brevo in production.');
    } else {
      warnings.push('EMAIL_PROVIDER=log: emails are NOT sent, only logged (no recipient/content).');
    }
  } else if (!parsed.EMAIL_API_KEY) {
    errors.push(`EMAIL_API_KEY is required for EMAIL_PROVIDER=${parsed.EMAIL_PROVIDER}`);
  }

  if (parsed.PAYMENTS_ENABLED === 'true') {
    const missing = (
      [
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REFRESH_TOKEN',
      ] as const
    ).filter((key) => !parsed[key]);
    missing.forEach((key) => errors.push(`${key} is required when PAYMENTS_ENABLED=true`));

    // Live keys only ever belong on the production server; anywhere else
    // this is almost certainly a mistake that would move real money.
    if (parsed.RAZORPAY_KEY_ID?.startsWith('rzp_live_') && parsed.NODE_ENV !== 'production') {
      errors.push('A live Razorpay key (rzp_live_...) is configured outside NODE_ENV=production. Use rzp_test_ keys.');
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, env: parsed, warnings };
};

const parseEnv = (): Env => {
  const result = validateEnv(process.env);
  if (!result.ok) {
    // Variable names and rule descriptions only, never values.
    logger.error('invalid environment, refusing to start', { problems: result.errors });
    process.exit(1);
  }
  result.warnings.forEach((warning) => logger.warn(warning));
  return result.env;
};

export const env = parseEnv();

// PAYMENTS_ENABLED gates online booking, pay_now, and the payment webhook
// route. Razorpay + Google env vars are only required at startup once this
// is true.
export const PAYMENTS_ENABLED = env.PAYMENTS_ENABLED === 'true';
