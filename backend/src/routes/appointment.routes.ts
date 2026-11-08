import { Router } from 'express';
import {
  createAppointment,
  getAllAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointment.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/', createAppointment);

// Protected routes
router.use(protect);
router.get('/', authorize('admin', 'staff'), getAllAppointments);
router.get('/:id', authorize('admin', 'staff'), getAppointment);
router.put('/:id', authorize('admin', 'staff'), updateAppointment);
router.delete('/:id', authorize('admin'), deleteAppointment);

export default router;
