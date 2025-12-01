import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updatePassword,
} from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'staff'])
    .withMessage('Role must be admin or staff'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

// Public routes
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);

// Admin only routes
router.post(
  '/register',
  protect,
  authorize('admin'),
  registerValidation,
  register
);

export default router;
