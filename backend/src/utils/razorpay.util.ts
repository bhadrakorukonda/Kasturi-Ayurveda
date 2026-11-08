import crypto from 'crypto';
import { env } from '../config/env';

// Thin client over Razorpay's REST API using Node's built-in fetch, so no
// SDK dependency is needed for the three things we do: create an order,
// create a refund, and verify webhook signatures.
//
// Only call these when PAYMENTS_ENABLED=true — env.ts guarantees the keys
// exist in that case, and every caller is already behind that flag.

const RAZORPAY_API = 'https://api.razorpay.com/v1';
const REQUEST_TIMEOUT_MS = 15_000;

export class RazorpayError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'RazorpayError';
  }
}

const authHeader = (): string => {
  const credentials = `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

const razorpayRequest = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${RAZORPAY_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Network failure / timeout. Never include the request (it carries auth).
    throw new RazorpayError(`Razorpay request to ${path} failed: ${(error as Error).name}`);
  }

  const json = (await response.json().catch(() => ({}))) as {
    error?: { code?: string; description?: string };
  };

  if (!response.ok) {
    throw new RazorpayError(
      json.error?.description || `Razorpay returned HTTP ${response.status}`,
      response.status,
      json.error?.code
    );
  }

  return json as T;
};

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

// amount is in paise and MUST come from Settings, never from the client.
// notes are visible in the Razorpay dashboard: keep them to our own ids,
// no patient data.
export const createRazorpayOrder = (params: {
  amount: number;
  currency: 'INR';
  receipt: string;
  appointmentId: string;
}): Promise<RazorpayOrder> =>
  razorpayRequest<RazorpayOrder>('/orders', {
    amount: params.amount,
    currency: params.currency,
    receipt: params.receipt,
    notes: { appointmentId: params.appointmentId },
  });

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

export const createRazorpayRefund = (params: {
  paymentId: string;
  amount: number;
  appointmentId: string;
}): Promise<RazorpayRefund> =>
  razorpayRequest<RazorpayRefund>(`/payments/${encodeURIComponent(params.paymentId)}/refund`, {
    amount: params.amount,
    speed: 'normal',
    notes: { appointmentId: params.appointmentId },
  });

// Webhook signature = hex HMAC-SHA256 of the RAW request body, keyed with
// the webhook secret (not the API key secret). Must be computed on the
// exact bytes Razorpay sent: re-serialising parsed JSON would not match.
export const verifyWebhookSignature = (rawBody: Buffer, signature: unknown): boolean => {
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET as string)
    .update(rawBody)
    .digest();
  const received = Buffer.from(signature, 'hex');

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};
