import { Router } from 'express';
import { PlanController } from '../controllers/plan.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { createPlanSchema, updatePlanSchema } from '../validations/plan.validation.js';

const router = Router();

// ─── PUBLIC Routes (no auth required) ────────────────────────────────────────
// GET /api/plans — returns active, non-deleted plans for users to browse
router.get('/', PlanController.getActivePlans);

// ─── ADMIN Routes (require auth + admin role) ─────────────────────────────────
router.use('/admin', authenticate, authorize('admin'));

// GET    /api/plans/admin           — list all plans (with optional ?includeDeleted=true)
router.get('/admin', PlanController.getAllPlans);

// GET    /api/plans/admin/:id       — get single plan with full audit history
router.get('/admin/:id', PlanController.getPlanById);

// POST   /api/plans/admin           — create a new plan
router.post('/admin', validateBody(createPlanSchema), PlanController.createPlan);

// PUT    /api/plans/admin/:id       — update plan fields
router.put('/admin/:id', validateBody(updatePlanSchema), PlanController.updatePlan);

// DELETE /api/plans/admin/:id       — soft delete plan
router.delete('/admin/:id', PlanController.deletePlan);

// PATCH  /api/plans/admin/:id/restore       — restore soft-deleted plan
router.patch('/admin/:id/restore', PlanController.restorePlan);

// PATCH  /api/plans/admin/:id/toggle-active — toggle isActive status
router.patch('/admin/:id/toggle-active', PlanController.toggleActive);

// GET    /api/plans/admin/:id/audit         — get full audit history for a plan
router.get('/admin/:id/audit', PlanController.getPlanAuditHistory);

export default router;
