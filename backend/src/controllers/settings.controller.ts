import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import { getSettings, updateSettings } from '../models/Settings.model';

const updateSettingsSchema = z
  .object({
    consultationPrice: z
      .object({
        INR: z.number().int().positive(),
        USD: z.number().int().positive(),
      })
      .strict()
      .optional(),
    usdEnabled: z.boolean().optional(),
    minNoticeMins: z.number().int().min(0).optional(),
    maxAdvanceDays: z.number().int().min(1).optional(),
    holdMinutes: z.number().int().min(1).optional(),
    refundWindowHours: z.number().int().min(0).optional(),
  })
  .strict();

// @desc    Get current settings (admin view, full document)
// @route   GET /api/settings/admin
// @access  Private (Admin)
export const getSettingsAdmin = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getSettings();

    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update settings (partial)
// @route   PUT /api/settings
// @access  Private (Admin)
export const putSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: parsed.error.format(),
      });
      return;
    }

    const settings = await updateSettings(parsed.data);

    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
