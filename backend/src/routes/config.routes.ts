import { Router } from 'express';
import { getConfig } from '../controllers/public.controller';

const router = Router();

// Public
router.get('/', getConfig);

export default router;
