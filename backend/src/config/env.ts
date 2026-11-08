import z from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
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

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  const parsed = result.data;

  if (parsed.PAYMENTS_ENABLED === 'true') {
    const missing = (['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'] as const).filter(
      (key) => !parsed[key]
    );
    if (missing.length > 0) {
      console.error('❌ PAYMENTS_ENABLED=true but these Razorpay variables are missing:');
      missing.forEach((key) => console.error(`   - ${key}`));
      process.exit(1);
    }

    // Live keys only ever belong on the production server; anywhere else
    // this is almost certainly a mistake that would move real money.
    if (parsed.RAZORPAY_KEY_ID!.startsWith('rzp_live_') && parsed.NODE_ENV !== 'production') {
      console.error('❌ A live Razorpay key (rzp_live_...) is configured outside NODE_ENV=production. Use rzp_test_ keys.');
      process.exit(1);
    }
  }

  // Log warning if email configuration is incomplete
  if (!parsed.EMAIL_HOST || !parsed.EMAIL_USER || !parsed.EMAIL_PASSWORD) {
    console.warn('⚠️  Warning: Email configuration is incomplete. Emails will not be sent.');
  }

  return parsed;
};

export const env = parseEnv();

// PAYMENTS_ENABLED gates online booking, pay_now, and the payment webhook
// route. Razorpay env vars are only required at startup once this is true.
export const PAYMENTS_ENABLED = env.PAYMENTS_ENABLED === 'true';
