import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  updateProfileSchema,
  changePasswordSchema,
} from '../validations/auth.validation.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile
router.get('/profile', UserController.getProfile);
router.put('/profile', validateBody(updateProfileSchema), UserController.updateProfile);
router.put('/change-password', validateBody(changePasswordSchema), UserController.changePassword);

// Admin only: get all users
router.get('/all', authorize('admin'), UserController.getAllUsers);

export default router;
