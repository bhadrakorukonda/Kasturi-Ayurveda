import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import z from 'zod';
import Appointment from '../models/Appointment.model';
import Doctor from '../models/Doctor.model';
import { getSettings } from '../models/Settings.model';
import { generateDaySlots, isSlotWithinBookingWindow } from '../utils/slots.util';
import { expireStaleHolds } from '../utils/holdExpiry.util';

const availabilityQuerySchema = z.object({
  doctorId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid doctorId'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});

// @desc    Free 30-minute slots for a doctor on a given day
// @route   GET /api/availability?doctorId&date
// @access  Public
export const getAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = availabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const { doctorId, date } = parsed.data;

    const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
    if (!doctor) {
      res.status(404).json({ status: 'error', message: 'Doctor not found' });
      return;
    }

    await expireStaleHolds();

    const settings = await getSettings();
    const daySlots = generateDaySlots(doctor, date).filter((slot) =>
      isSlotWithinBookingWindow(slot.start, settings)
    );

    if (daySlots.length === 0) {
      res.status(200).json({ status: 'success', data: { doctorId, date, slots: [] } });
      return;
    }

    const dayStart = daySlots[0].start;
    const dayEnd = daySlots[daySlots.length - 1].end;

    const activeAppointments = await Appointment.find({
      doctorId,
      isActiveSlot: true,
      slotStart: { $gte: dayStart, $lt: dayEnd },
    }).select('slotStart');

    const bookedStarts = new Set(activeAppointments.map((a) => a.slotStart.getTime()));

    const freeSlots = daySlots
      .filter((slot) => !bookedStarts.has(slot.start.getTime()))
      .map((slot) => slot.start.toISOString());

    res.status(200).json({
      status: 'success',
      data: { doctorId, date, slots: freeSlots },
    });
  } catch (error) {
    next(error);
  }
};
