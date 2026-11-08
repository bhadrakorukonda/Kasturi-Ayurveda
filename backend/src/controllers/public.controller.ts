import { Request, Response, NextFunction } from 'express';
import Doctor from '../models/Doctor.model';
import { getSettings } from '../models/Settings.model';
import { PAYMENTS_ENABLED } from '../config/env';

// @desc    List active doctors (public fields only)
// @route   GET /api/doctors
// @access  Public
export const listDoctors = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctors = await Doctor.find({ isActive: true });

    res.status(200).json({
      status: 'success',
      data: doctors.map((doctor) => ({
        id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        supportsOnline: doctor.supportsOnline,
        slotDurationMins: doctor.slotDurationMins,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public booking config (price, available modes, booking windows)
// @route   GET /api/config
// @access  Public
export const getConfig = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getSettings();

    const modes: string[] = ['in_person'];
    if (PAYMENTS_ENABLED) {
      modes.push('online');
    }

    res.status(200).json({
      status: 'success',
      data: {
        consultationPriceINR: settings.consultationPrice.INR,
        consultationPriceDisplay: `₹${(settings.consultationPrice.INR / 100).toFixed(2)}`,
        modes,
        minNoticeMins: settings.minNoticeMins,
        maxAdvanceDays: settings.maxAdvanceDays,
        refundWindowHours: settings.refundWindowHours,
        // pay_now is only offered when payments are live; holdMinutes lets
        // the UI tell the patient how long the slot is held while paying.
        paymentsEnabled: PAYMENTS_ENABLED,
        holdMinutes: settings.holdMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};
