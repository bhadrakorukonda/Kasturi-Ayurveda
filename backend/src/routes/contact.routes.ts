import { Router } from 'express';
import {
  createContact,
  getAllContacts,
  updateContactStatus,
  deleteContact,
} from '../controllers/contact.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/', createContact);

// Protected routes
router.use(protect);
router.get('/', authorize('admin', 'staff'), getAllContacts);
router.put('/:id', authorize('admin', 'staff'), updateContactStatus);
router.delete('/:id', authorize('admin'), deleteContact);

export default router;
