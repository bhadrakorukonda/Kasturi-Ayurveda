import { Router } from 'express';
import {
  createAppointment,
  getAllAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointment,
} from '../controllers/appointment.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { patientAccessLimiter, requirePatientToken, optionalPatientToken, maybeAdminAuth } from '../middleware/patientAccess.middleware';

const router = Router();

// Public
router.post('/', createAppointment);

// Public, token-gated (patient)
router.post('/:id/cancel', patientAccessLimiter, requirePatientToken, cancelAppointment);

// Dual-mode: patient via ?token=, or admin/staff via JWT
router.get('/:id', patientAccessLimiter, optionalPatientToken, maybeAdminAuth, getAppointment);

// Protected (admin/staff only below this point)
router.use(protect);
router.get('/', authorize('admin', 'staff'), getAllAppointments);
router.put('/:id', authorize('admin', 'staff'), updateAppointment);
router.delete('/:id', authorize('admin'), deleteAppointment);

export default router;
