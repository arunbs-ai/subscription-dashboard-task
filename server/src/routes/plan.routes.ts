import { Router } from 'express';
import { PlanController } from '../controllers/plan.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { createPlanSchema, updatePlanSchema } from '../validations/plan.validation.js';

const router = Router();

router.get('/', PlanController.getActivePlans);
router.use('/admin', authenticate, authorize('admin'));
router.get('/admin', PlanController.getAllPlans);
router.get('/admin/:id', PlanController.getPlanById);
router.post('/admin', validateBody(createPlanSchema), PlanController.createPlan);
router.put('/admin/:id', validateBody(updatePlanSchema), PlanController.updatePlan);
router.delete('/admin/:id', PlanController.deletePlan);
router.patch('/admin/:id/restore', PlanController.restorePlan);
router.patch('/admin/:id/toggle-active', PlanController.toggleActive);
router.get('/admin/:id/audit', PlanController.getPlanAuditHistory);

export default router;
