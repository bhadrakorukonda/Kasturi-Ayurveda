import { Router } from 'express';
import { listDoctors } from '../controllers/public.controller';
import { listAllDoctors, updateDoctorSchedule } from '../controllers/doctor.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public
router.get('/', listDoctors);

// Admin
router.get('/admin', protect, authorize('admin'), listAllDoctors);
router.put('/:id/schedule', protect, authorize('admin'), updateDoctorSchedule);

export default router;
