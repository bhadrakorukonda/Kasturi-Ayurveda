import { Router } from 'express';
import { body } from 'express-validator';
import {
  createContact,
  getAllContacts,
  updateContactStatus,
  deleteContact,
} from '../controllers/contact.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Validation rules
const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
];

// Public routes
router.post('/', contactValidation, createContact);

// Protected routes
router.use(protect);
router.get('/', authorize('admin', 'staff'), getAllContacts);
router.put('/:id', authorize('admin', 'staff'), updateContactStatus);
router.delete('/:id', authorize('admin'), deleteContact);

export default router;
