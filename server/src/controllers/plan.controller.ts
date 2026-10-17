import { Request, Response, NextFunction } from 'express';
import { Plan, IPlan } from '../models/Plan.js';
import { PlanFeature } from '../models/PlanFeature.js';
import { PlanAuditLog } from '../models/PlanAuditLog.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { Types } from 'mongoose';

// ─── Helper: Build field-level diff ──────────────────────────────────────────
const buildChanges = (
  original: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, { oldValue: unknown; newValue: unknown }> => {
  const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};
  for (const key of Object.keys(updates)) {
    const oldValue = original[key];
    const newValue = updates[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { oldValue, newValue };
    }
  }
  return changes;
};

// ─── Helper: Write audit log entry ───────────────────────────────────────────
const writeAudit = async (
  plan: IPlan,
  action: 'created' | 'updated' | 'deleted' | 'restored',
  actor: { _id: Types.ObjectId; name: string; email: string },
  changes: Record<string, { oldValue: unknown; newValue: unknown }>,
  note?: string
) => {
  await PlanAuditLog.create({
    planId: plan._id,
    planName: plan.name,
    action,
    performedBy: actor._id,
    performedByName: actor.name,
    performedByEmail: actor.email,
    changes,
    note: note || '',
    timestamp: new Date(),
  });
};

// ─── Helper: Attach features from separate PlanFeature table ──────────────────
const attachFeatures = async (plans: any[]) => {
  if (!plans || plans.length === 0) return [];
  const planIds = plans.map((p) => p._id);
  const allFeatures = await PlanFeature.find({ planId: { $in: planIds } }).sort({ order: 1 });

  return Promise.all(
    plans.map(async (p) => {
      const pObj = p.toObject ? p.toObject() : { ...p };
      const matchingFeatures = allFeatures
        .filter((f) => f.planId.toString() === p._id.toString())
        .map((f) => ({
          _id: f._id,
          planId: f.planId,
          label: f.label,
          included: f.included,
          order: f.order,
        }));

      if (matchingFeatures.length > 0) {
        pObj.features = matchingFeatures;
      } else if (pObj.features && pObj.features.length > 0) {
        // Auto-migrate legacy features to separate PLAN_FEATURES collection
        const newFeatures = pObj.features.map((f: any, idx: number) => ({
          planId: p._id,
          label: typeof f === 'string' ? f : f.label,
          included: typeof f === 'string' ? true : f.included !== false,
          order: idx,
        }));
        await PlanFeature.insertMany(newFeatures);
        pObj.features = newFeatures;
      }
      return pObj;
    })
  );
};

const syncPlanFeatures = async (planId: Types.ObjectId, features?: any[]) => {
  if (!features || !Array.isArray(features)) return;
  await PlanFeature.deleteMany({ planId });
  const featureDocs = features.map((f, index) => {
    const label = typeof f === 'string' ? f : f.label;
    const included = typeof f === 'string' ? true : f.included !== false;
    return {
      planId,
      label,
      included,
      order: index,
    };
  });
  if (featureDocs.length > 0) {
    await PlanFeature.insertMany(featureDocs);
  }
};

export class PlanController {
  // ─── PUBLIC: Get All Active Plans ─────────────────────────────────────────
  static async getActivePlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawPlans = await Plan.find({ isActive: true, isDeleted: false })
        .sort({ sortOrder: 1, createdAt: 1 });
      const plans = await attachFeatures(rawPlans);
      res.status(200).json({ success: true, data: { plans } });
    } catch (error) {
      next(error);
    }
  }

  // ─── ADMIN: Get All Plans ─────────────────────────────────────────────────
  static async getAllPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { includeDeleted } = req.query;
      const filter: Record<string, unknown> = {};
      if (includeDeleted !== 'true') filter.isDeleted = false;
      const rawPlans = await Plan.find(filter).sort({ sortOrder: 1, createdAt: 1 });
      const plans = await attachFeatures(rawPlans);
      res.status(200).json({ success: true, data: { plans } });
    } catch (error) {
      next(error);
    }
  }

  // ─── ADMIN: Get Single Plan by ID ─────────────────────────────────────────
  static async getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan) {
        res.status(404).json({ success: false, message: 'Plan not found.' });
        return;
      }
      const [enriched] = await attachFeatures([plan]);
      res.status(200).json({ success: true, data: { plan: enriched } });
    } catch (error) {
      next(error);
    }
  }

  // ─── ADMIN: Create Plan ───────────────────────────────────────────────────
  static async createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { note, features, ...planData } = req.body;
      const actor = req.user!;

      const plan = await Plan.create(planData);

      // Store features in separate PLAN_FEATURES collection mapped by planId
      if (features) {
        await syncPlanFeatures(plan._id, features);
      }

      await writeAudit(plan, 'created', actor as any, {}, note || 'Plan created.');

      const [enriched] = await attachFeatures([plan]);

      res.status(201).json({ success: true, message: 'Plan created successfully.', data: { plan: enriched } });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, message: 'A plan with this name already exists.' });
        return;
      }
      next(error);
    }
  }

  // ─── ADMIN: Update Plan ───────────────────────────────────────────────────
  static async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan || plan.isDeleted) {
        res.status(404).json({ success: false, message: 'Plan not found.' });
        return;
      }

      const { note, features, ...updates } = req.body;
      const actor = req.user!;

      // Build diff before applying updates
      const changes = buildChanges(plan.toObject() as unknown as Record<string, unknown>, updates);

      Object.assign(plan, updates);
      await plan.save();

      // Sync features in separate PLAN_FEATURES collection
      if (features !== undefined) {
        await syncPlanFeatures(plan._id, features);
      }

      await writeAudit(plan, 'updated', actor as any, changes, note);

      const [enriched] = await attachFeatures([plan]);

      res.status(200).json({ success: true, message: 'Plan updated successfully.', data: { plan: enriched } });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, message: 'A plan with this name already exists.' });
        return;
      }
      next(error);
    }
  }

  // ─── ADMIN: Soft Delete Plan ──────────────────────────────────────────────
  static async deletePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan || plan.isDeleted) {
        res.status(404).json({ success: false, message: 'Plan not found.' });
        return;
      }

      const actor = req.user!;
      const { note } = req.body;
      const prevActive = plan.isActive;

      plan.isDeleted = true;
      plan.isActive = false;
      plan.deletedAt = new Date();
      await plan.save();

      await writeAudit(plan, 'deleted', actor as any, {
        isDeleted: { oldValue: false, newValue: true },
        isActive: { oldValue: prevActive, newValue: false },
      }, note || 'Plan soft-deleted.');

      res.status(200).json({ success: true, message: 'Plan deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // ─── ADMIN: Restore Soft-Deleted Plan ────────────────────────────────────
  static async restorePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan || !plan.isDeleted) {
        res.status(404).json({ success: false, message: 'Plan not found or is not deleted.' });
        return;
      }

      const actor = req.user!;
      const { note } = req.body;

      plan.isDeleted = false;
      plan.isActive = true;
      plan.deletedAt = null;
      await plan.save();

      await writeAudit(plan, 'restored', actor as any, {
        isDeleted: { oldValue: true, newValue: false },
        isActive: { oldValue: false, newValue: true },
      }, note || 'Plan restored.');

      res.status(200).json({ success: true, message: 'Plan restored successfully.', data: { plan } });
    } catch (error) {
      next(error);
    }
  }

  // ─── ADMIN: Toggle Active ─────────────────────────────────────────────────
  static async toggleActive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan || plan.isDeleted) {
        res.status(404).json({ success: false, message: 'Plan not found.' });
        return;
      }

      const actor = req.user!;
      const prevActive = plan.isActive;
      plan.isActive = !plan.isActive;
      await plan.save();

      await writeAudit(plan, 'updated', actor as any, {
        isActive: { oldValue: prevActive, newValue: plan.isActive },
      }, plan.isActive ? 'Plan activated.' : 'Plan deactivated.');

      res.status(200).json({
        success: true,
        message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully.`,
        data: { isActive: plan.isActive },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── ADMIN: Get Audit History for a Plan ─────────────────────────────────
  static async getPlanAuditHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await Plan.findById(req.params.id).select('name');
      if (!plan) {
        res.status(404).json({ success: false, message: 'Plan not found.' });
        return;
      }

      const auditHistory = await PlanAuditLog.find({ planId: plan._id })
        .sort({ timestamp: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        data: { planId: plan._id, planName: plan.name, auditHistory },
      });
    } catch (error) {
      next(error);
    }
  }
}
