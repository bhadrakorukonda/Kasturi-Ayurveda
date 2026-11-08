import nodemailer from 'nodemailer';
import { IAppointment } from '../models/Appointment.model';
import { IContact } from '../models/Contact.model';
import { env } from '../config/env';

// Create transporter
const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: Number(env.EMAIL_PORT),
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration (non-blocking)
transporter.verify().then(() => {
  console.log('✅ Email server is ready to send messages');
}).catch((error) => {
  console.error('❌ Email configuration error:', error.message);
  console.log('⚠️  Emails will not be sent. Server continues running.');
});

export const sendAppointmentConfirmation = async (
  appointment: IAppointment
): Promise<void> => {
  if (!appointment.patient.email) {
    console.log('⚠️  No email provided for appointment, skipping email notification');
    return;
  }

  const slotDateTime = new Date(appointment.slotStart).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const modeLabel = appointment.mode === 'online' ? 'Online Consultation' : 'In-Person Consultation';

  const mailOptions = {
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: appointment.patient.email,
    subject: 'Appointment Confirmation - Kasturi Ayurveda',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b9e78;">Appointment Confirmation</h2>
        <p>Dear ${appointment.patient.name},</p>
        <p>Thank you for booking an appointment with Kasturi Ayurveda. Your appointment details are:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date & Time (IST):</strong> ${slotDateTime}</p>
          <p><strong>Consultation Type:</strong> ${modeLabel}</p>
          ${appointment.patient.symptoms ? `<p><strong>Symptoms:</strong> ${appointment.patient.symptoms}</p>` : ''}
        </div>

        <p>We will contact you shortly to confirm your appointment.</p>

        <p><strong>Contact Information:</strong></p>
        <p>Phone: 8247736253<br>
        Email: kasturiayurvedahyd@gmail.com</p>

        <p>Best regards,<br>
        <strong>Kasturi Ayurveda Team</strong></p>
      </div>
    `,
  };

  // Send to admin
  const adminMailOptions = {
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: env.EMAIL_USER,
    subject: 'New Appointment Booking',
    html: `
      <h2>New Appointment Booking</h2>
      <p><strong>Name:</strong> ${appointment.patient.name}</p>
      ${appointment.patient.email ? `<p><strong>Email:</strong> ${appointment.patient.email}</p>` : ''}
      <p><strong>Phone:</strong> ${appointment.patient.phone}</p>
      <p><strong>Date & Time (IST):</strong> ${slotDateTime}</p>
      <p><strong>Consultation Type:</strong> ${modeLabel}</p>
      ${appointment.patient.symptoms ? `<p><strong>Symptoms:</strong> ${appointment.patient.symptoms}</p>` : ''}
      ${appointment.patient.age ? `<p><strong>Age:</strong> ${appointment.patient.age}</p>` : ''}
    `,
  };

  try {
    await Promise.all([
      transporter.sendMail(mailOptions),
      transporter.sendMail(adminMailOptions),
    ]);
    console.log('✅ Appointment confirmation emails sent successfully');
  } catch (error) {
    console.error('❌ Failed to send appointment emails:', error);
    // Don't throw error - allow appointment to be created even if email fails
  }
};

export const sendContactConfirmation = async (
  contact: IContact
): Promise<void> => {
  const mailOptions = {
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: contact.email,
    subject: 'We received your message - Kasturi Ayurveda',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b9e78;">Thank You for Contacting Us</h2>
        <p>Dear ${contact.name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${contact.subject ? `<p><strong>Subject:</strong> ${contact.subject}</p>` : ''}
          <p><strong>Message:</strong> ${contact.message}</p>
        </div>
        
        <p>If you need immediate assistance, please call us at 8247736253.</p>
        
        <p>Best regards,<br>
        <strong>Kasturi Ayurveda Team</strong></p>
      </div>
    `,
  };

  // Send to admin
  const adminMailOptions = {
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: env.EMAIL_USER,
    subject: 'New Contact Message',
    html: `
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${contact.name}</p>
      <p><strong>Email:</strong> ${contact.email}</p>
      ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
      ${contact.subject ? `<p><strong>Subject:</strong> ${contact.subject}</p>` : ''}
      <p><strong>Message:</strong> ${contact.message}</p>
    `,
  };

  try {
    await Promise.all([
      transporter.sendMail(mailOptions),
      transporter.sendMail(adminMailOptions),
    ]);
    console.log('✅ Contact confirmation emails sent successfully');
  } catch (error) {
    console.error('❌ Failed to send contact emails:', error);
    // Don't throw error - allow contact to be created even if email fails
  }
};
