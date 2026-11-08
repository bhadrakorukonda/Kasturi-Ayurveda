import { Router } from 'express';
import { getSettingsAdmin, putSettings } from '../controllers/settings.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Admin only
router.use(protect, authorize('admin'));
router.get('/admin', getSettingsAdmin);
router.put('/', putSettings);

export default router;
