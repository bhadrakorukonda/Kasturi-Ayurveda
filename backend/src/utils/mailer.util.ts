import { env } from '../config/env';

// Provider-agnostic transactional email. Switch providers with
// EMAIL_PROVIDER (resend | brevo); both are plain HTTPS calls via the
// built-in fetch, no SDK.
//
// Never log recipients or bodies: they are patient data. Log only the
// "kind" of email and our own appointment id.

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Short label for logs, e.g. "confirmation:<appointmentId>". Also used
  // as an idempotency key where the provider supports one.
  tag: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

const parseFrom = (from: string): { name: string; email: string } => {
  const match = from.match(/^\s*([^<>]+?)\s*<([^<>\s]+)>\s*$/);
  // env.ts already validated the format, so this always matches.
  return { name: match![1], email: match![2] };
};

const post = async (url: string, headers: Record<string, string>, body: unknown): Promise<void> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // Provider error bodies describe the problem (bad key, unverified
    // sender), not the email content, so a short excerpt is safe to log.
    throw new Error(`HTTP ${response.status} ${detail.slice(0, 200)}`);
  }
};

const sendViaResend = (email: OutgoingEmail) =>
  post(
    'https://api.resend.com/emails',
    {
      Authorization: `Bearer ${env.EMAIL_API_KEY}`,
      // Resend de-duplicates retries carrying the same key for 24h.
      'Idempotency-Key': email.tag.slice(0, 256),
    },
    { from: env.EMAIL_FROM, to: [email.to], subject: email.subject, html: email.html, text: email.text }
  );

const sendViaBrevo = (email: OutgoingEmail) =>
  post(
    'https://api.brevo.com/v3/smtp/email',
    { 'api-key': env.EMAIL_API_KEY as string },
    {
      sender: parseFrom(env.EMAIL_FROM),
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }
  );

// Throws on failure so callers can decide whether to retry.
export const sendEmail = async (email: OutgoingEmail): Promise<void> => {
  const kind = email.tag.split(':')[0];
  try {
    if (env.EMAIL_PROVIDER === 'resend') {
      await sendViaResend(email);
    } else if (env.EMAIL_PROVIDER === 'brevo') {
      await sendViaBrevo(email);
    } else {
      console.log(`📧 [EMAIL_PROVIDER=log] would send "${kind}" (${email.tag})`);
      return;
    }
    console.log(`📧 Sent "${kind}" email (${email.tag})`);
  } catch (error) {
    throw new Error(`Email "${email.tag}" via ${env.EMAIL_PROVIDER} failed: ${(error as Error).message}`);
  }
};
