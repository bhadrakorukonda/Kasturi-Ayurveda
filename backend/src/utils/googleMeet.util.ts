import { env } from '../config/env';
import { IAppointment } from '../models/Appointment.model';

// Google Meet links for online consultations, created as events on the
// clinic's Google Calendar (regular Gmail account, OAuth refresh token
// obtained once with `npm run google-auth`). Plain REST via fetch.
//
// Idempotent: the calendar event id IS the appointment id (a Mongo
// ObjectId is 24 hex chars, which is valid Google base32hex). A retry that
// hits "already exists" just reads the existing event back.
//
// Privacy: the patient is NOT added as an attendee (Google would email
// them an invite and see their address). The event carries only the
// patient's name for the doctor, no contact details or symptoms.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const REQUEST_TIMEOUT_MS = 15_000;

export class GoogleApiError extends Error {
  constructor(message: string, public readonly httpStatus?: number) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
    throw new GoogleApiError('Google Calendar credentials are not configured');
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token) {
    // e.g. "invalid_grant" = refresh token revoked/expired: re-run google-auth.
    throw new GoogleApiError(`Google token refresh failed: ${json.error ?? response.status}`, response.status);
  }

  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
};

interface CalendarEvent {
  id: string;
  status?: string;
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: { status?: { statusCode?: string } };
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
}

const calendarRequest = async (method: string, path: string, body?: unknown): Promise<{ status: number; event?: CalendarEvent }> => {
  const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 204) return { status: 204 };
  const json = (await response.json().catch(() => ({}))) as CalendarEvent & { error?: { message?: string } };
  if (!response.ok && response.status !== 409) {
    throw new GoogleApiError(`Google Calendar ${method} failed: ${response.status} ${json.error?.message ?? ''}`.trim(), response.status);
  }
  return { status: response.status, event: response.ok ? json : undefined };
};

const meetLinkOf = (event?: CalendarEvent): string | undefined =>
  event?.hangoutLink ?? event?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const eventIdFor = (appointment: IAppointment): string => String(appointment._id);

// Creates (or finds) the calendar event + Meet for an online appointment.
// Returns the event id and Meet link. Throws if Google fails or the
// conference never becomes ready.
export const ensureMeetForAppointment = async (appointment: IAppointment): Promise<{ eventId: string; meetLink: string }> => {
  const eventId = eventIdFor(appointment);
  const query = '?conferenceDataVersion=1&sendUpdates=none';

  const inserted = await calendarRequest('POST', `/events${query}`, {
    id: eventId,
    summary: `Online consultation: ${appointment.patient.name}`,
    description: `Kasturi Ayurveda online consultation (booking ${eventId}). Patient details are in the admin dashboard.`,
    start: { dateTime: appointment.slotStart.toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: appointment.slotEnd.toISOString(), timeZone: 'Asia/Kolkata' },
    conferenceData: {
      createRequest: { requestId: eventId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
  });

  let event = inserted.event;

  if (inserted.status === 409) {
    // Already created by an earlier attempt (or deleted on a previous
    // cancel and now being re-confirmed). Read it back; revive if cancelled.
    event = (await calendarRequest('GET', `/events/${eventId}`)).event;
    if (event?.status === 'cancelled') {
      event = (await calendarRequest('PATCH', `/events/${eventId}${query}`, { status: 'confirmed' })).event;
    }
  }

  // Conference creation can be asynchronous; poll briefly.
  for (let attempt = 0; !meetLinkOf(event) && attempt < 4; attempt++) {
    if (event?.conferenceData?.createRequest?.status?.statusCode === 'failure') break;
    await sleep(1500);
    event = (await calendarRequest('GET', `/events/${eventId}`)).event;
  }

  const meetLink = meetLinkOf(event);
  if (!meetLink) {
    throw new GoogleApiError(`Meet link not available yet for event ${eventId}`);
  }
  return { eventId, meetLink };
};

// Best-effort: frees the doctor's calendar when an online booking is
// cancelled. A missing event (404/410) counts as success.
export const deleteMeetEvent = async (eventId: string): Promise<void> => {
  try {
    await calendarRequest('DELETE', `/events/${encodeURIComponent(eventId)}?sendUpdates=none`);
  } catch (error) {
    if (error instanceof GoogleApiError && (error.httpStatus === 404 || error.httpStatus === 410)) return;
    throw error;
  }
};
