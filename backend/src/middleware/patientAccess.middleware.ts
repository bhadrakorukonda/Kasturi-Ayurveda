import { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.model';
import { verifyAnyPatientAccessToken } from '../utils/token.util';
import { protect, authorize, AuthRequest } from './auth.middleware';
import { IAppointment } from '../models/Appointment.model';

export interface PatientRequest extends AuthRequest {
  patientAppointment?: IAppointment;
}

// Covers both the token-gated GET and the cancel POST below.
export const patientAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
});

const loadAppointmentForToken = async (
  id: string,
  token: unknown
): Promise<IAppointment | null> => {
  if (!mongoose.Types.ObjectId.isValid(id) || typeof token !== 'string' || !token) {
    return null;
  }

  const appointment = await Appointment.findById(id);
  if (
    !appointment ||
    !verifyAnyPatientAccessToken(token, [appointment.accessTokenHash, ...(appointment.additionalAccessTokenHashes ?? [])])
  ) {
    return null;
  }

  return appointment;
};

// Used by the cancel route: a valid ?token= is mandatory, no admin fallback.
export const requirePatientToken = async (
  req: PatientRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const appointment = await loadAppointmentForToken(req.params.id, req.query.token);

  if (!appointment) {
    res.status(403).json({ status: 'error', message: 'Invalid or expired access link' });
    return;
  }

  req.patientAppointment = appointment;
  next();
};

// Used by the dual-mode GET /:id route: if a token is present, it must be
// valid; if no token is present at all, fall through to admin auth.
export const optionalPatientToken = async (
  req: PatientRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.query.token === undefined) {
    next();
    return;
  }

  const appointment = await loadAppointmentForToken(req.params.id, req.query.token);
  if (!appointment) {
    res.status(403).json({ status: 'error', message: 'Invalid or expired access link' });
    return;
  }

  req.patientAppointment = appointment;
  next();
};

// If optionalPatientToken already attached a patient appointment, skip
// admin auth entirely. Otherwise fall back to the normal admin/staff JWT
// check — protect/authorize send their own response and don't call next()
// on failure, so chaining them as plain calls here is safe.
export const maybeAdminAuth = (req: PatientRequest, res: Response, next: NextFunction): void => {
  if (req.patientAppointment) {
    next();
    return;
  }

  protect(req, res, () => authorize('admin', 'staff')(req, res, next));
};
