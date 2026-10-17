import { Response, NextFunction } from 'express';
import { Subscription, ISubscription } from '../models/Subscription.js';
import { Plan } from '../models/Plan.js';
import { PlanFeature } from '../models/PlanFeature.js';
import { UserCard } from '../models/UserCard.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

// ─── Helper: Auto-activate scheduled subscriptions if current has ended ────────
const checkAndPromoteSubscriptions = async (userId: any) => {
  const now = new Date();
  const activeSub = await Subscription.findOne({
    userId,
    status: 'active',
  });

  if (activeSub && activeSub.endDate <= now) {
    // Current active plan has ended
    const scheduledSub = await Subscription.findOne({
      userId,
      status: 'scheduled',
      startDate: { $lte: now },
    });

    if (scheduledSub) {
      activeSub.status = 'expired';
      await activeSub.save();

      scheduledSub.status = 'active';
      scheduledSub.startDate = now;
      await scheduledSub.save();
    } else {
      activeSub.status = 'expired';
      await activeSub.save();
    }
  }
};

export class SubscriptionController {
  // ─── GET My Subscription (User Dashboard) ───────────────────────────────────
  static async getMySubscription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;

      // Check auto-promotion
      await checkAndPromoteSubscriptions(userId);

      const activeSub = await Subscription.findOne({
        userId,
        status: 'active',
      })
        .populate('planId')
        .populate('cardId');

      const scheduledSub = await Subscription.findOne({
        userId,
        status: 'scheduled',
      })
        .populate('planId')
        .populate('cardId');

      let activePlanFeatures: any[] = [];
      let scheduledPlanFeatures: any[] = [];

      if (activeSub && activeSub.planId) {
        activePlanFeatures = await PlanFeature.find({ planId: (activeSub.planId as any)._id }).sort({ order: 1 });
      }

      if (scheduledSub && scheduledSub.planId) {
        scheduledPlanFeatures = await PlanFeature.find({ planId: (scheduledSub.planId as any)._id }).sort({ order: 1 });
      }

      // Default mock invoices based on active subscription
      const invoices = activeSub
        ? [
            {
              id: 'inv_' + activeSub._id.toString().slice(-6) + '_01',
              date: activeSub.startDate.toISOString(),
              amount: activeSub.price,
              currency: activeSub.currency,
              status: 'paid',
            },
          ]
        : [];

      // Realistic usage stats matching current plan limits
      const plan = activeSub?.planId as any;
      const usage = {
        teamMembers: {
          used: 2,
          limit: plan?.maxUsers ?? 5,
        },
        storageGB: {
          used: Math.min(4.2, (plan?.storageGB ?? 10) * 0.4),
          limit: plan?.storageGB ?? 10,
        },
        projects: {
          used: 3,
          limit: plan?.maxProjects ?? 5,
        },
        apiRequests: {
          used: 12450,
          limit: 50000,
        },
      };

      res.status(200).json({
        success: true,
        data: {
          activeSubscription: activeSub
            ? {
                ...activeSub.toObject(),
                plan: {
                  ...(activeSub.planId as any).toObject(),
                  features: activePlanFeatures,
                },
              }
            : null,
          scheduledSubscription: scheduledSub
            ? {
                ...scheduledSub.toObject(),
                plan: {
                  ...(scheduledSub.planId as any).toObject(),
                  features: scheduledPlanFeatures,
                },
              }
            : null,
          usage,
          invoices,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── POST Purchase / Subscribe to Plan ──────────────────────────────────────
  static async purchaseSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const { planId, billingCycle = 'monthly', cardId, cardDetails } = req.body;

      if (!planId) {
        res.status(400).json({ success: false, message: 'planId is required.' });
        return;
      }

      // 1. Verify Plan
      const plan = await Plan.findById(planId);
      if (!plan || plan.isDeleted || !plan.isActive) {
        res.status(404).json({ success: false, message: 'Plan is either not found or currently inactive.' });
        return;
      }

      // 2. Handle Payment Card
      let finalCardId = cardId;
      if (!finalCardId && cardDetails) {
        const { holderName, brand, cardNumber, last4, expMonth, expYear } = cardDetails;
        const finalLast4 = cardNumber ? cardNumber.replace(/\s+/g, '').slice(-4) : (last4 || '4242');
        const userCard = await UserCard.create({
          userId,
          holderName: holderName ? holderName.trim() : req.user!.name,
          brand: brand || 'Visa',
          last4: finalLast4,
          expMonth: Number(expMonth || 12),
          expYear: Number(expYear || 2028),
          isDefault: true,
        });
        finalCardId = userCard._id;
      } else if (!finalCardId) {
        // Find user's default card or most recent card
        const existingCard = await UserCard.findOne({ userId }).sort({ isDefault: -1, createdAt: -1 });
        if (existingCard) {
          finalCardId = existingCard._id;
        } else {
          // Create dummy default card for user
          const defaultCard = await UserCard.create({
            userId,
            holderName: req.user!.name,
            brand: 'Visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2028,
            isDefault: true,
          });
          finalCardId = defaultCard._id;
        }
      }

      // 3. Promote / Expire checks
      await checkAndPromoteSubscriptions(userId);

      const activeSub = await Subscription.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() },
      });

      const existingScheduledSub = await Subscription.findOne({
        userId,
        status: 'scheduled',
      });

      // ─── RULE: If active plan exists AND already purchased another plan, don't allow!
      if (activeSub && existingScheduledSub) {
        res.status(400).json({
          success: false,
          message:
            'You already have an active subscription and an upcoming plan queued. You cannot purchase another plan until the queued plan starts.',
        });
        return;
      }

      const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      const durationMs = cycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

      let newSubscription: ISubscription;

      if (activeSub) {
        // ─── RULE: If active plan exists, schedule only AFTER current plan ends
        const startDate = new Date(activeSub.endDate);
        const endDate = new Date(startDate.getTime() + durationMs);

        newSubscription = await Subscription.create({
          userId,
          planId: plan._id,
          cardId: finalCardId,
          status: 'scheduled',
          scheduleType: 'after_current_plan',
          billingCycle: cycle,
          price,
          currency: plan.currency || 'USD',
          startDate,
          endDate,
          cancelAtPeriodEnd: false,
        });

        res.status(201).json({
          success: true,
          message: `Plan purchased successfully! Scheduled to start on ${startDate.toLocaleDateString()} after your current plan completes.`,
          data: { subscription: newSubscription, scheduleType: 'after_current_plan' },
        });
      } else {
        // ─── RULE: If NO active plan, start from now automatically
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + durationMs);

        newSubscription = await Subscription.create({
          userId,
          planId: plan._id,
          cardId: finalCardId,
          status: 'active',
          scheduleType: 'start_now',
          billingCycle: cycle,
          price,
          currency: plan.currency || 'USD',
          startDate,
          endDate,
          cancelAtPeriodEnd: false,
        });

        res.status(201).json({
          success: true,
          message: 'Plan purchased successfully and activated immediately.',
          data: { subscription: newSubscription, scheduleType: 'start_now' },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // ─── Cancel Subscription (at period end) ────────────────────────────────────
  static async cancelSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const subscription = await Subscription.findOne({
        userId,
        status: 'active',
      });

      if (!subscription) {
        res.status(404).json({ success: false, message: 'No active subscription found to cancel.' });
        return;
      }

      subscription.cancelAtPeriodEnd = true;
      await subscription.save();

      res.status(200).json({
        success: true,
        message: 'Your subscription is scheduled to cancel at the end of the current billing cycle.',
        data: { subscription },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Reactivate Subscription ────────────────────────────────────────────────
  static async reactivateSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const subscription = await Subscription.findOne({
        userId,
        status: 'active',
      });

      if (!subscription) {
        res.status(404).json({ success: false, message: 'No active subscription found.' });
        return;
      }

      subscription.cancelAtPeriodEnd = false;
      await subscription.save();

      res.status(200).json({
        success: true,
        message: 'Subscription renewal reactivated successfully.',
        data: { subscription },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── ADMIN: Get All Subscribers ─────────────────────────────────────────────
  static async getAdminSubscribers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriptions = await Subscription.find()
        .populate('userId', 'name email company phone createdAt')
        .populate('planId', 'name description monthlyPrice yearlyPrice maxUsers storageGB')
        .populate('cardId', 'brand last4 expMonth expYear')
        .sort({ createdAt: -1 });

      const totalSubscribers = new Set(subscriptions.map((s) => s.userId?._id?.toString()).filter(Boolean)).size;
      const activeCount = subscriptions.filter((s) => s.status === 'active').length;
      const scheduledCount = subscriptions.filter((s) => s.status === 'scheduled').length;
      const cancelledCount = subscriptions.filter((s) => s.cancelAtPeriodEnd || s.status === 'cancelled').length;

      // Estimate MRR (Monthly Recurring Revenue)
      const mrr = subscriptions
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => {
          const monthlyAmount = s.billingCycle === 'yearly' ? Math.round(s.price / 12) : s.price;
          return sum + (monthlyAmount || 0);
        }, 0);

      res.status(200).json({
        success: true,
        data: {
          subscribers: subscriptions,
          metrics: {
            totalSubscribers,
            activeCount,
            scheduledCount,
            cancelledCount,
            mrr,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
