import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import z from 'zod';
import Appointment, { IAppointment } from '../models/Appointment.model';
import Doctor from '../models/Doctor.model';
import { getSettings } from '../models/Settings.model';
import { sendAppointmentConfirmation } from '../utils/email.util';
import { generateDaySlots, isSlotWithinBookingWindow, utcToISTDateString } from '../utils/slots.util';
import { expireStaleHolds } from '../utils/holdExpiry.util';
import { generatePatientAccessToken } from '../utils/token.util';
import { PAYMENTS_ENABLED } from '../config/env';

const isObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);

const createAppointmentSchema = z
  .object({
    doctorId: z.string().refine(isObjectId, 'Invalid doctorId'),
    slotStart: z.coerce.date(),
    mode: z.enum(['in_person', 'online']),
    paymentMode: z.enum(['pay_now', 'pay_at_clinic']),
    consentAccepted: z.boolean().optional(),
    patient: z
      .object({
        name: z.string().trim().min(1).max(100),
        phone: z.string().regex(/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'),
        email: z.string().trim().email().optional(),
        age: z.number().int().min(1).max(150).optional(),
        symptoms: z.string().trim().max(500).optional(),
      })
      .strict(),
  })
  .strict();

const updateAppointmentSchema = z
  .object({
    status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']),
  })
  .strict();

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Public
export const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { doctorId, slotStart, mode, paymentMode, consentAccepted, patient } = parsed.data;

    if (mode === 'online' && paymentMode !== 'pay_now') {
      res.status(400).json({ status: 'error', message: 'Online consultations require pay_now' });
      return;
    }

    if (paymentMode === 'pay_now' && !PAYMENTS_ENABLED) {
      res.status(400).json({ status: 'error', message: 'Online payments are not available yet' });
      return;
    }

    if (mode === 'online' && !consentAccepted) {
      res.status(400).json({ status: 'error', message: 'Consent is required for online consultations' });
      return;
    }

    const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
    if (!doctor) {
      res.status(404).json({ status: 'error', message: 'Doctor not found' });
      return;
    }

    if (mode === 'online' && !doctor.supportsOnline) {
      res.status(400).json({ status: 'error', message: 'This doctor does not support online consultations' });
      return;
    }

    await expireStaleHolds();

    const settings = await getSettings();

    const dateIST = utcToISTDateString(slotStart);
    const daySlots = generateDaySlots(doctor, dateIST);
    const matchedSlot = daySlots.find((slot) => slot.start.getTime() === slotStart.getTime());

    if (!matchedSlot || !isSlotWithinBookingWindow(slotStart, settings)) {
      res.status(400).json({ status: 'error', message: 'The selected slot is not available for booking' });
      return;
    }

    const existingActive = await Appointment.findOne({
      doctorId,
      slotStart: matchedSlot.start,
      isActiveSlot: true,
    });
    if (existingActive) {
      res.status(409).json({ status: 'error', message: 'This slot is no longer available' });
      return;
    }

    const { token, hash } = generatePatientAccessToken();

    let appointment: IAppointment;
    try {
      appointment = await Appointment.create({
        doctorId,
        slotStart: matchedSlot.start,
        slotEnd: matchedSlot.end,
        kind: 'consultation',
        mode,
        paymentMode,
        currency: 'INR',
        amountDue: settings.consultationPrice.INR,
        paymentStatus: 'unpaid',
        status: 'confirmed',
        isActiveSlot: true,
        patient,
        consentAcceptedAt: mode === 'online' ? new Date() : undefined,
        accessTokenHash: hash,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        res.status(409).json({ status: 'error', message: 'This slot was just booked by someone else. Please choose another time.' });
        return;
      }
      throw error;
    }

    try {
      await sendAppointmentConfirmation(appointment);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'Appointment created successfully',
      data: {
        id: appointment._id,
        doctorId: appointment.doctorId,
        slotStart: appointment.slotStart,
        slotEnd: appointment.slotEnd,
        mode: appointment.mode,
        paymentMode: appointment.paymentMode,
        status: appointment.status,
        amountDue: appointment.amountDue,
        accessToken: token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private (Admin/Staff)
export const getAllAppointments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, date, page = 1, limit = 10 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.slotStart = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .sort({ slotStart: 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id
// @access  Private (Admin/Staff)
export const updateAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateAppointmentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { status } = parsed.data;
    const update: Record<string, unknown> = { status };
    const unset: Record<string, string> = {};

    if (status === 'cancelled' || status === 'completed' || status === 'no_show') {
      unset.isActiveSlot = '';
      if (status === 'cancelled') {
        update.cancelledAt = new Date();
        update.cancelledBy = 'admin';
      }
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!appointment) {
      res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Appointment updated successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Admin)
export const deleteAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
