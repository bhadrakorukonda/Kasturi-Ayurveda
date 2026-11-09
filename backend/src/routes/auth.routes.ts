import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getMe,
  updatePassword,
} from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Login brute-force protection: 5 failed attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again later.',
});

// Public routes
router.post('/login', loginLimiter, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);

// Admin only routes
router.post('/register', protect, authorize('admin'), register);

export default router;
