import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Appointment, { IAppointment } from '../models/Appointment.model';
import { sendAppointmentConfirmation } from '../utils/email.util';

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Public
export const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 'error',
        errors: errors.array(),
      });
      return;
    }

    const appointment = await Appointment.create(req.body);

    // Send confirmation email
    try {
      await sendAppointmentConfirmation(appointment as unknown as IAppointment);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'Appointment created successfully',
      data: appointment,
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
      query.date = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .sort({ date: 1, time: 1 })
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

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private (Admin/Staff)
export const updateAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
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
