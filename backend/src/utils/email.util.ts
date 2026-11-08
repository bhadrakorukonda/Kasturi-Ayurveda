import { IAppointment } from '../models/Appointment.model';
import { IContact } from '../models/Contact.model';
import { env } from '../config/env';
import { sendEmail } from './mailer.util';

// Email content. Rules (CLAUDE.md, DPDP): minimal PII. Never include
// symptoms, age or phone. Patient-facing emails carry the patient's own
// name, the slot, and links. Clinic notifications point to the dashboard
// instead of repeating patient details. Every user-supplied string is
// HTML-escaped.
//
// All send* functions THROW on failure; callers decide whether to retry.

const CLINIC_PHONE = '8247736253';
const BRAND_COLOR = '#6b9e78';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const formatSlotIST = (date: Date): string =>
  new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const rupees = (paise: number): string => `₹${(paise / 100).toFixed(2)}`;

export const buildManageLink = (appointmentId: unknown, token: string): string =>
  `${env.FRONTEND_URL}/booking/${String(appointmentId)}?token=${token}`;

const dashboardLink = () => `${env.FRONTEND_URL}/dashboard`;

interface Block {
  label: string;
  value: string; // plain text; escaped when rendered
}

interface Link {
  label: string;
  url: string;
}

// One simple layout for every email: greeting, intro, a details box, links.
const render = (params: {
  heading: string;
  greetingName?: string;
  intro: string[];
  details?: Block[];
  links?: Link[];
  outro?: string[];
}): { html: string; text: string } => {
  const { heading, greetingName, intro, details = [], links = [], outro = [] } = params;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
  <h2 style="color: ${BRAND_COLOR};">${escapeHtml(heading)}</h2>
  ${greetingName ? `<p>Dear ${escapeHtml(greetingName)},</p>` : ''}
  ${intro.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n  ')}
  ${
    details.length
      ? `<div style="background-color: #f5f5f5; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
    ${details.map((d) => `<p style="margin: 6px 0;"><strong>${escapeHtml(d.label)}:</strong> ${escapeHtml(d.value)}</p>`).join('\n    ')}
  </div>`
      : ''
  }
  ${links
    .map(
      (l) =>
        `<p><a href="${escapeHtml(l.url)}" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; padding: 10px 18px; border-radius: 20px; text-decoration: none;">${escapeHtml(l.label)}</a></p>`
    )
    .join('\n  ')}
  ${outro.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n  ')}
  <p style="margin-top: 24px;">Questions? Call us at ${CLINIC_PHONE}.</p>
  <p>Warm regards,<br><strong>Kasturi Ayurveda</strong></p>
</div>`.trim();

  const text = [
    heading,
    '',
    ...(greetingName ? [`Dear ${greetingName},`, ''] : []),
    ...intro.flatMap((p) => [p, '']),
    ...details.map((d) => `${d.label}: ${d.value}`),
    ...(details.length ? [''] : []),
    ...links.flatMap((l) => [`${l.label}: ${l.url}`]),
    ...(links.length ? [''] : []),
    ...outro.flatMap((p) => [p, '']),
    `Questions? Call us at ${CLINIC_PHONE}.`,
    '',
    'Warm regards,',
    'Kasturi Ayurveda',
  ].join('\n');

  return { html, text };
};

const slotDetails = (a: IAppointment): Block[] => [
  { label: 'Date & time (IST)', value: formatSlotIST(a.slotStart) },
  { label: 'Consultation', value: a.mode === 'online' ? 'Online (Google Meet)' : 'In person at the clinic' },
];

const paymentDetail = (a: IAppointment): Block =>
  a.paymentMode === 'pay_at_clinic'
    ? { label: 'Payment', value: `${rupees(a.amountDue)}, payable at the clinic` }
    : { label: 'Payment', value: `${rupees(a.amountPaid)} paid online` };

// ---- Patient emails -------------------------------------------------------

export const sendBookingConfirmation = async (a: IAppointment, manageToken: string): Promise<void> => {
  if (!a.patient.email) return;
  const manage = buildManageLink(a._id, manageToken);

  const intro = ['Your consultation with Kasturi Ayurveda is confirmed.'];
  const links: Link[] = [];
  const outro: string[] = [];

  if (a.mode === 'online') {
    if (a.meetLink) {
      links.push({ label: 'Join the Google Meet', url: a.meetLink });
      outro.push('Please join a couple of minutes early from a quiet place with a stable connection. Sessions are not recorded.');
    } else {
      outro.push("Your Google Meet link isn't ready yet. It will appear on your booking page and we'll email it to you.");
    }
  }
  links.push({ label: 'View or cancel your booking', url: manage });

  const { html, text } = render({
    heading: 'Appointment confirmed',
    greetingName: a.patient.name,
    intro,
    details: [...slotDetails(a), paymentDetail(a)],
    links,
    outro,
  });

  await sendEmail({ to: a.patient.email, subject: 'Your appointment is confirmed - Kasturi Ayurveda', html, text, tag: `confirmation:${String(a._id)}` });
};

export const sendMeetLinkReady = async (a: IAppointment, manageToken: string): Promise<void> => {
  if (!a.patient.email || !a.meetLink) return;
  const { html, text } = render({
    heading: 'Your Google Meet link',
    greetingName: a.patient.name,
    intro: ['The video link for your online consultation is ready.'],
    details: slotDetails(a),
    links: [
      { label: 'Join the Google Meet', url: a.meetLink },
      { label: 'View your booking', url: buildManageLink(a._id, manageToken) },
    ],
  });
  await sendEmail({ to: a.patient.email, subject: 'Your Google Meet link - Kasturi Ayurveda', html, text, tag: `meet-link:${String(a._id)}` });
};

export const sendReminder = async (a: IAppointment, manageToken: string): Promise<void> => {
  if (!a.patient.email) return;
  const links: Link[] = [];
  if (a.mode === 'online' && a.meetLink) links.push({ label: 'Join the Google Meet', url: a.meetLink });
  links.push({ label: 'View your booking', url: buildManageLink(a._id, manageToken) });

  const { html, text } = render({
    heading: 'Reminder: your appointment is tomorrow',
    greetingName: a.patient.name,
    intro: ['This is a reminder of your upcoming consultation with Kasturi Ayurveda.'],
    details: [...slotDetails(a), paymentDetail(a)],
    links,
    outro: ['Online cancellation is no longer available this close to the appointment. Please call us if you need to change it.'],
  });
  await sendEmail({ to: a.patient.email, subject: 'Reminder: your appointment tomorrow - Kasturi Ayurveda', html, text, tag: `reminder:${String(a._id)}` });
};

export type RefundNote = 'refunded' | 'needs_manual_refund' | 'none';

export const sendCancellation = async (a: IAppointment, refund: RefundNote): Promise<void> => {
  if (!a.patient.email) return;

  const intro = [
    a.cancelledBy === 'patient'
      ? 'Your appointment has been cancelled as requested.'
      : 'We are sorry, but your appointment has been cancelled by the clinic.',
  ];
  if (refund === 'refunded') {
    intro.push(`A full refund of ${rupees(a.amountRefunded)} has been issued. It usually reaches your account within 5-7 working days.`);
  } else if (refund === 'needs_manual_refund') {
    intro.push(`Your refund of ${rupees(a.amountPaid)} will be processed by the clinic shortly. We will email you once it is issued.`);
  }

  const { html, text } = render({
    heading: 'Appointment cancelled',
    greetingName: a.patient.name,
    intro,
    details: slotDetails(a),
    links: [{ label: 'Book a new appointment', url: `${env.FRONTEND_URL}/booking` }],
  });
  await sendEmail({ to: a.patient.email, subject: 'Your appointment has been cancelled - Kasturi Ayurveda', html, text, tag: `cancellation:${String(a._id)}` });
};

// Sent when a refund is issued on its own (admin refund), not as part of
// a cancellation (that email already mentions the refund).
export const sendRefundNotice = async (a: IAppointment): Promise<void> => {
  if (!a.patient.email) return;
  const { html, text } = render({
    heading: 'Refund issued',
    greetingName: a.patient.name,
    intro: [
      `A full refund of ${rupees(a.amountRefunded)} for your consultation has been issued.`,
      'It usually reaches your account within 5-7 working days.',
    ],
    details: [{ label: 'Original appointment (IST)', value: formatSlotIST(a.slotStart) }],
  });
  await sendEmail({ to: a.patient.email, subject: 'Your refund has been issued - Kasturi Ayurveda', html, text, tag: `refund:${String(a._id)}:${a.razorpayRefundId ?? ''}` });
};

// ---- Clinic notifications (only if CLINIC_NOTIFY_EMAIL is set) -------------

export const sendClinicNewBooking = async (a: IAppointment): Promise<void> => {
  if (!env.CLINIC_NOTIFY_EMAIL) return;
  const { html, text } = render({
    heading: 'New appointment booked',
    intro: ['A new consultation has been booked. Patient details are in the dashboard.'],
    details: [...slotDetails(a), paymentDetail(a)],
    links: [{ label: 'Open the dashboard', url: dashboardLink() }],
  });
  await sendEmail({ to: env.CLINIC_NOTIFY_EMAIL, subject: 'New appointment booked', html, text, tag: `clinic-booking:${String(a._id)}` });
};

// ---- Contact form ----------------------------------------------------------

// Deliberately does not echo the message back: it may contain health
// details, and email is not a place to keep those.
export const sendContactConfirmation = async (contact: IContact): Promise<void> => {
  const id = String((contact as unknown as { _id: unknown })._id);
  const tasks: Promise<void>[] = [];

  if (contact.email) {
    const { html, text } = render({
      heading: 'We received your message',
      greetingName: contact.name,
      intro: ['Thank you for contacting Kasturi Ayurveda. We have received your message and will get back to you as soon as possible.'],
    });
    tasks.push(sendEmail({ to: contact.email, subject: 'We received your message - Kasturi Ayurveda', html, text, tag: `contact-ack:${id}` }));
  }

  if (env.CLINIC_NOTIFY_EMAIL) {
    const { html, text } = render({
      heading: 'New contact message',
      intro: ['A new message was submitted through the website contact form. Read it in the dashboard.'],
      links: [{ label: 'Open the dashboard', url: dashboardLink() }],
    });
    tasks.push(sendEmail({ to: env.CLINIC_NOTIFY_EMAIL, subject: 'New contact message', html, text, tag: `contact-clinic:${id}` }));
  }

  const results = await Promise.allSettled(tasks);
  const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  if (failed) throw failed.reason;
};
