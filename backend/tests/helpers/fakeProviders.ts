import { vi } from 'vitest';

// In-memory stand-ins for every outbound HTTP call the backend makes
// (Razorpay, Resend/Brevo, Google OAuth + Calendar). Installed by replacing
// global fetch, so the real backend code paths run unchanged. Any other
// URL throws: tests must never touch the network.

export interface SentEmail {
  tag: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface CalendarOp {
  op: 'insert' | 'get' | 'patch' | 'delete';
  id: string;
  body?: Record<string, unknown>;
  query?: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export class FakeProviders {
  emails: SentEmail[] = [];
  calendarOps: CalendarOp[] = [];
  refundCalls: { paymentId: string; amount: number }[] = [];
  orders: { id: string; amount: number; currency: string }[] = [];
  events = new Map<string, { id: string; status: string; hangoutLink: string }>();
  fail = { email: false, google: false, refund: false, order: false };
  refundDelayMs = 0;
  private n = 0;

  reset(): void {
    this.emails = [];
    this.calendarOps = [];
    this.refundCalls = [];
    this.orders = [];
    this.events.clear();
    this.fail = { email: false, google: false, refund: false, order: false };
    this.refundDelayMs = 0;
  }

  emailsFor(id: unknown): SentEmail[] {
    return this.emails.filter((e) => e.tag.includes(String(id)));
  }

  fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = typeof init.body === 'string' ? init.body : undefined;

    // ---- Razorpay
    if (url.startsWith('https://api.razorpay.com/')) {
      if (!headers.Authorization?.startsWith('Basic ')) return json(401, { error: { description: 'no auth' } });
      const data = JSON.parse(body ?? '{}');
      if (url.endsWith('/v1/orders')) {
        if (this.fail.order) return json(500, { error: { code: 'SERVER_ERROR', description: 'fake order failure' } });
        const order = { id: `order_fake${this.n++}`, amount: data.amount, currency: data.currency };
        this.orders.push(order);
        return json(200, { ...order, status: 'created' });
      }
      const refund = url.match(/\/v1\/payments\/([^/]+)\/refund$/);
      if (refund) {
        if (this.refundDelayMs) await new Promise((r) => setTimeout(r, this.refundDelayMs));
        this.refundCalls.push({ paymentId: refund[1], amount: data.amount });
        if (this.fail.refund) return json(400, { error: { code: 'BAD_REQUEST_ERROR', description: 'fake refund failure' } });
        return json(200, { id: `rfnd_fake${this.n++}`, payment_id: refund[1], amount: data.amount, status: 'processed' });
      }
    }

    // ---- Resend
    if (url === 'https://api.resend.com/emails') {
      if (!headers.Authorization?.startsWith('Bearer ')) return json(401, { message: 'no key' });
      if (this.fail.email) return json(500, { message: 'fake email outage' });
      const data = JSON.parse(body ?? '{}');
      this.emails.push({ tag: headers['Idempotency-Key'], from: data.from, to: data.to, subject: data.subject, html: data.html, text: data.text });
      return json(200, { id: `email_${this.n++}` });
    }

    // ---- Google OAuth
    if (url === 'https://oauth2.googleapis.com/token') {
      if (this.fail.google) return json(400, { error: 'invalid_grant' });
      return json(200, { access_token: 'ya29.fake', expires_in: 3600 });
    }

    // ---- Google Calendar
    if (url.startsWith('https://www.googleapis.com/calendar/v3/calendars/')) {
      if (headers.Authorization !== 'Bearer ya29.fake') return json(401, { error: { message: 'bad token' } });
      if (this.fail.google) return json(503, { error: { message: 'fake calendar outage' } });
      const parsed = new URL(url);
      const id = decodeURIComponent(parsed.pathname.split('/events')[1]?.replace(/^\//, '') ?? '');

      if (method === 'POST') {
        const data = JSON.parse(body ?? '{}');
        this.calendarOps.push({ op: 'insert', id: data.id, body: data, query: parsed.search });
        if (this.events.has(data.id)) return json(409, { error: { message: 'duplicate' } });
        const event = { id: data.id, status: 'confirmed', hangoutLink: `https://meet.google.com/fake-${data.id.slice(-6)}` };
        this.events.set(data.id, event);
        return json(200, event);
      }
      const event = this.events.get(id);
      if (method === 'GET') {
        this.calendarOps.push({ op: 'get', id });
        return event ? json(200, event) : json(404, { error: { message: 'not found' } });
      }
      if (method === 'PATCH') {
        this.calendarOps.push({ op: 'patch', id });
        if (!event) return json(404, { error: { message: 'not found' } });
        Object.assign(event, JSON.parse(body ?? '{}'));
        return json(200, event);
      }
      if (method === 'DELETE') {
        this.calendarOps.push({ op: 'delete', id });
        if (!event) return json(404, { error: { message: 'gone' } });
        event.status = 'cancelled';
        return new Response(null, { status: 204 });
      }
    }

    throw new Error(`Unexpected outbound request in tests: ${method} ${url}`);
  };
}

export const installFakeProviders = (): FakeProviders => {
  const fakes = new FakeProviders();
  vi.stubGlobal('fetch', fakes.fetch);
  return fakes;
};
