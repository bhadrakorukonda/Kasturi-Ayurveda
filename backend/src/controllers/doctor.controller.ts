import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import Doctor from '../models/Doctor.model';

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleWindowSchema = z
  .object({
    start: z.string().regex(HHMM_REGEX, 'start must be in HH:mm format'),
    end: z.string().regex(HHMM_REGEX, 'end must be in HH:mm format'),
  })
  .strict()
  .refine((w) => w.start < w.end, {
    message: 'window start must be before end',
  });

const weeklyScheduleSchema = z
  .object({
    workingDays: z.array(z.number().int().min(0).max(6)),
    windows: z.array(scheduleWindowSchema),
  })
  .strict();

const updateScheduleSchema = z
  .object({
    weeklySchedule: weeklyScheduleSchema.optional(),
    blockedDates: z.array(z.coerce.date()).optional(),
    isActive: z.boolean().optional(),
    supportsOnline: z.boolean().optional(),
  })
  .strict();

// @desc    List all doctors (all fields, incl. inactive)
// @route   GET /api/doctors/admin
// @access  Private (Admin)
export const listAllDoctors = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctors = await Doctor.find();

    res.status(200).json({
      status: 'success',
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a doctor's schedule / activation / online support
// @route   PUT /api/doctors/:id/schedule
// @access  Private (Admin)
export const updateDoctorSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateScheduleSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      res.status(404).json({
        status: 'error',
        message: 'Doctor not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Doctor schedule updated successfully',
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};
