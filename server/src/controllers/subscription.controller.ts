import { Response, NextFunction } from 'express';
import { Subscription, ISubscription } from '../models/Subscription.js';
import { Plan } from '../models/Plan.js';
import { PlanFeature } from '../models/PlanFeature.js';
import { UserCard } from '../models/UserCard.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const checkAndPromoteSubscriptions = async (userId: any) => {
  const now = new Date();
  const activeSub = await Subscription.findOne({
    userId,
    status: 'active',
  });

  if (activeSub && activeSub.endDate <= now) {
    const scheduledSub = await Subscription.findOne({
      userId,
      status: 'scheduled',
      startDate: { $lte: now },
    });

    if (scheduledSub) {
      activeSub.status = activeSub.cancelAtPeriodEnd ? 'cancelled' : 'expired';
      await activeSub.save();

      scheduledSub.status = 'active';
      scheduledSub.startDate = now;
      await scheduledSub.save();
    } else {
      activeSub.status = activeSub.cancelAtPeriodEnd ? 'cancelled' : 'expired';
      await activeSub.save();
    }
  }
};

export class SubscriptionController {
  static async getMySubscription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;

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

      const allSubs = await Subscription.find({ userId }).populate('planId', 'name').sort({ createdAt: -1 });
      const invoices = allSubs.map((sub) => {
        const planName = (sub.planId as any)?.name || 'Plan';
        const kind = sub.changeType || 'new';
        const description =
          kind === 'new'
            ? `Purchase: ${planName}`
            : `${kind === 'upgrade' ? 'Upgrade' : 'Downgrade'}: ${sub.previousPlanName || 'Previous plan'} to ${planName}`;
        return {
          id: ('INV-' + sub._id.toString().slice(-8)).toUpperCase(),
          date: sub.createdAt.toISOString(),
          amount: sub.price,
          currency: sub.currency,
          status: 'paid',
          description,
          changeType: kind,
          planName,
          billingCycle: sub.billingCycle,
          subscriptionStatus: sub.status,
        };
      });

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

  static async purchaseSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const { planId, billingCycle = 'monthly', cardId, cardDetails } = req.body;

      if (!planId) {
        res.status(400).json({ success: false, message: 'planId is required.' });
        return;
      }

      const plan = await Plan.findById(planId);
      if (!plan || plan.isDeleted || !plan.isActive) {
        res.status(404).json({ success: false, message: 'Plan is either not found or currently inactive.' });
        return;
      }

      let finalCardId = cardId;
      if (!finalCardId && cardDetails) {
        const { holderName, brand, cardNumber, last4, expMonth, expYear } = cardDetails;
        const finalLast4 = cardNumber ? cardNumber.replace(/\s+/g, '').slice(-4) : last4;
        const m = Number(expMonth);
        const y = Number(expYear);
        const now = new Date();
        if (
          !/^\d{4}$/.test(String(finalLast4 || '')) ||
          !(m >= 1 && m <= 12) ||
          y < now.getFullYear() ||
          (y === now.getFullYear() && m < now.getMonth() + 1)
        ) {
          res.status(400).json({ success: false, message: 'Please provide valid card details.' });
          return;
        }
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
        const existingCard = await UserCard.findOne({ userId }).sort({ isDefault: -1, createdAt: -1 });
        if (existingCard) {
          finalCardId = existingCard._id;
        } else {
          res.status(400).json({
            success: false,
            message: 'Please add a payment card before buying a plan.',
          });
          return;
        }
      }

      await checkAndPromoteSubscriptions(userId);

      const activeSub = await Subscription.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() },
      }).populate('planId');

      const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      const durationMs = cycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const now = new Date();

      let changeType: 'new' | 'upgrade' | 'downgrade' = 'new';
      let previousPlanName = '';

      if (activeSub) {
        const currentPlan = activeSub.planId as any;
        previousPlanName = currentPlan?.name || 'Previous plan';

        if (currentPlan && String(currentPlan._id) === String(plan._id) && activeSub.billingCycle === cycle) {
          res.status(400).json({ success: false, message: 'You are already subscribed to this plan.' });
          return;
        }

        changeType = plan.monthlyPrice >= (currentPlan?.monthlyPrice ?? 0) ? 'upgrade' : 'downgrade';

        activeSub.status = 'cancelled';
        activeSub.cancelAtPeriodEnd = false;
        activeSub.cancelledAt = now;
        activeSub.cancellationMode = 'plan_change';
        activeSub.cancellationReason = `Replaced by ${changeType} to ${plan.name}`;
        activeSub.endDate = now;
        await activeSub.save();
      }

      await Subscription.updateMany(
        { userId, status: 'scheduled' },
        {
          status: 'cancelled',
          cancelledAt: now,
          cancellationMode: 'plan_change',
          cancellationReason: `Replaced by plan change to ${plan.name}`,
        }
      );

      const newSubscription: ISubscription = await Subscription.create({
        userId,
        planId: plan._id,
        cardId: finalCardId,
        status: 'active',
        scheduleType: 'start_now',
        billingCycle: cycle,
        price,
        currency: plan.currency || 'USD',
        startDate: now,
        endDate: new Date(now.getTime() + durationMs),
        cancelAtPeriodEnd: false,
        changeType,
        previousPlanName,
      });

      const message =
        changeType === 'new'
          ? 'Plan purchased successfully and activated immediately.'
          : `Plan ${changeType} successful. ${plan.name} is active now and your ${previousPlanName} plan was cancelled.`;

      res.status(201).json({
        success: true,
        message,
        data: { subscription: newSubscription, changeType },
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      const { immediately = false, reason = '', subscriptionId } = req.body || {};
      const note = String(reason).trim().slice(0, 300);
      const now = new Date();

      if (subscriptionId) {
        const queued = await Subscription.findOne({ _id: subscriptionId, userId, status: 'scheduled' });
        if (!queued) {
          res.status(404).json({ success: false, message: 'Queued subscription not found.' });
          return;
        }
        queued.status = 'cancelled';
        queued.cancelledAt = now;
        queued.cancellationMode = 'immediate';
        queued.cancellationReason = note;
        await queued.save();
        res.status(200).json({ success: true, message: 'Your upcoming plan has been cancelled.', data: { subscription: queued } });
        return;
      }

      const subscription = await Subscription.findOne({ userId, status: 'active' });
      if (!subscription) {
        res.status(404).json({ success: false, message: 'No active subscription found to cancel.' });
        return;
      }

      if (immediately) {
        subscription.status = 'cancelled';
        subscription.cancelAtPeriodEnd = false;
        subscription.cancelledAt = now;
        subscription.cancellationMode = 'immediate';
        subscription.cancellationReason = note;
        subscription.endDate = now;
        await subscription.save();

        const queued = await Subscription.findOne({ userId, status: 'scheduled' }).sort({ startDate: 1 });
        if (queued) {
          const duration = queued.endDate.getTime() - queued.startDate.getTime();
          queued.status = 'active';
          queued.scheduleType = 'start_now';
          queued.startDate = now;
          queued.endDate = new Date(now.getTime() + duration);
          await queued.save();
        }

        res.status(200).json({
          success: true,
          message: queued
            ? 'Your subscription was cancelled. Your queued plan is now active.'
            : 'Your subscription was cancelled immediately.',
          data: { subscription },
        });
        return;
      }

      subscription.cancelAtPeriodEnd = true;
      subscription.cancelledAt = now;
      subscription.cancellationMode = 'period_end';
      subscription.cancellationReason = note;
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

  static async getSubscriptionHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id;
      await checkAndPromoteSubscriptions(userId);
      const subs = await Subscription.find({ userId })
        .populate('planId', 'name tier monthlyPrice yearlyPrice')
        .populate('cardId', 'brand last4')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: {
          history: subs.map((s) => {
            const plan = s.planId as any;
            const card = s.cardId as any;
            return {
              id: s._id,
              planName: plan?.name || 'Plan',
              tier: plan?.tier || null,
              status: s.status,
              billingCycle: s.billingCycle,
              price: s.price,
              currency: s.currency,
              startDate: s.startDate,
              endDate: s.endDate,
              scheduleType: s.scheduleType,
              changeType: s.changeType || 'new',
              previousPlanName: s.previousPlanName || '',
              cancelAtPeriodEnd: s.cancelAtPeriodEnd,
              cancelledAt: s.cancelledAt || null,
              cancellationMode: s.cancellationMode || null,
              cancellationReason: s.cancellationReason || '',
              card: card ? { brand: card.brand, last4: card.last4 } : null,
              createdAt: s.createdAt,
            };
          }),
        },
      });
    } catch (error) {
      next(error);
    }
  }

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
      subscription.cancelledAt = null;
      subscription.cancellationMode = null;
      subscription.cancellationReason = '';
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

  static async getAdminSubscribers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriptions = await Subscription.find()
        .populate('userId', 'name email company phone createdAt')
        .populate('planId', 'name tier description monthlyPrice yearlyPrice maxUsers storageGB')
        .populate('cardId', 'brand last4 expMonth expYear')
        .sort({ createdAt: -1 });

      const totalSubscribers = new Set(subscriptions.map((s) => s.userId?._id?.toString()).filter(Boolean)).size;
      const activeCount = subscriptions.filter((s) => s.status === 'active').length;
      const scheduledCount = subscriptions.filter((s) => s.status === 'scheduled').length;
      const cancelledCount = subscriptions.filter((s) => s.cancelAtPeriodEnd || s.status === 'cancelled').length;

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
