import { Router } from 'express';
import { body } from 'express-validator';
import {
  createAppointment,
  getAllAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointment.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Validation rules
const appointmentValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('appointmentDate').isISO8601().withMessage('Please provide a valid date'),
  body('appointmentTime').notEmpty().withMessage('Time is required'),
  body('service').notEmpty().withMessage('Service is required'),
  body('symptoms').optional().trim(),
  body('preferredDoctor').optional().trim(),
  body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Please provide a valid age'),
];

// Public routes
router.post('/', appointmentValidation, createAppointment);

// Protected routes
router.use(protect);
router.get('/', authorize('admin', 'staff'), getAllAppointments);
router.get('/:id', getAppointment);
router.put('/:id', authorize('admin', 'staff'), updateAppointment);
router.delete('/:id', authorize('admin'), deleteAppointment);

export default router;
