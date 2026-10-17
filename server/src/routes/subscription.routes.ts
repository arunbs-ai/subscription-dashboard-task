import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// User subscription endpoints (requires auth)
router.get('/my', authenticate, SubscriptionController.getMySubscription);
router.post('/purchase', authenticate, SubscriptionController.purchaseSubscription);
router.post('/cancel', authenticate, SubscriptionController.cancelSubscription);
router.post('/reactivate', authenticate, SubscriptionController.reactivateSubscription);

// Admin subscriber management (requires admin role)
router.get('/admin/subscribers', authenticate, authorize('admin'), SubscriptionController.getAdminSubscribers);

export default router;
