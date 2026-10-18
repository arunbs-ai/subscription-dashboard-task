import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { Plan } from '../models/Plan.js';
import { PlanFeature } from '../models/PlanFeature.js';
import { UserCard } from '../models/UserCard.js';
import { Subscription } from '../models/Subscription.js';
import { PlanAuditLog } from '../models/PlanAuditLog.js';
import { config } from '../config/config.js';

const DEFAULT_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    apiRequests: 25000,
    description: 'Perfect for individuals and small teams just getting started.',
    monthlyPrice: 9,
    yearlyPrice: 90,
    currency: 'USD',
    billingCycle: 'both',
    maxUsers: 3,
    maxProjects: 5,
    storageGB: 10,
    isActive: true,
    isFeatured: false,
    trialDays: 14,
    sortOrder: 1,
    features: [
      { label: 'Up to 3 team members', included: true },
      { label: '5 active projects', included: true },
      { label: '10 GB cloud storage', included: true },
      { label: 'Email support', included: true },
      { label: 'Basic analytics', included: true },
      { label: 'API access', included: false },
      { label: 'Custom integrations', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    name: 'Professional',
    tier: 'pro',
    apiRequests: 100000,
    description: 'Ideal for growing teams who need more power and flexibility.',
    monthlyPrice: 29,
    yearlyPrice: 290,
    currency: 'USD',
    billingCycle: 'both',
    maxUsers: 20,
    maxProjects: 50,
    storageGB: 100,
    isActive: true,
    isFeatured: true,
    trialDays: 14,
    sortOrder: 2,
    features: [
      { label: 'Up to 20 team members', included: true },
      { label: '50 active projects', included: true },
      { label: '100 GB cloud storage', included: true },
      { label: 'Priority email & chat support', included: true },
      { label: 'Advanced analytics & reports', included: true },
      { label: 'Full API access', included: true },
      { label: 'Custom integrations', included: true },
      { label: 'Dedicated account manager', included: false },
    ],
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    apiRequests: 1000000,
    description: 'For large organizations requiring unlimited scale and dedicated support.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    currency: 'USD',
    billingCycle: 'both',
    maxUsers: 999,
    maxProjects: 999,
    storageGB: 1000,
    isActive: true,
    isFeatured: false,
    trialDays: 30,
    sortOrder: 3,
    features: [
      { label: 'Unlimited team members', included: true },
      { label: 'Unlimited projects', included: true },
      { label: '1 TB cloud storage', included: true },
      { label: '24/7 phone & priority support', included: true },
      { label: 'Custom analytics & white-label reports', included: true },
      { label: 'Full API access + webhooks', included: true },
      { label: 'Custom integrations & SSO', included: true },
      { label: 'Dedicated account manager', included: true },
    ],
  },
];

export const seedRolesAndAdmin = async (): Promise<void> => {
  try {
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'admin',
        description: 'Administrator with full system and subscription management privileges',
      });
      console.log('[SEED] Created Role: admin');
    }

    let userRole = await Role.findOne({ name: 'user' });
    if (!userRole) {
      userRole = await Role.create({
        name: 'user',
        description: 'Standard subscriber and workspace member',
      });
      console.log('[SEED] Created Role: user');
    }

    const existingAdmin = await User.findOne({ email: config.adminSeed.email.toLowerCase() });
    if (!existingAdmin) {
      const adminUser = new User({
        name: config.adminSeed.name,
        email: config.adminSeed.email.toLowerCase(),
        password: config.adminSeed.password, 
        role: adminRole._id,
        company: config.adminSeed.company,
        phone: '+1 (555) 999-0000',
      });

      await adminUser.save();
      console.log(`[SEED] Initial Admin account created:`);
      console.log(`   Email: ${config.adminSeed.email}`);
      console.log(`   Password: ${config.adminSeed.password}`);
      console.log(`   Role ID: ${adminRole._id}`);
    } else {
      console.log(`[SEED] Admin account already present (${config.adminSeed.email})`);
    }

    const adminUser = await User.findOne({ email: config.adminSeed.email.toLowerCase() });
    for (const planData of DEFAULT_PLANS) {
      await Plan.updateOne(
        { name: planData.name, tier: { $exists: false } },
        { $set: { tier: (planData as any).tier, apiRequests: (planData as any).apiRequests } }
      );
      let plan = await Plan.findOne({ name: planData.name });
      if (!plan) {
        plan = await Plan.create(planData);
        await PlanAuditLog.create({
          planId: plan._id,
          planName: plan.name,
          action: 'created',
          performedBy: adminUser?._id,
          performedByName: adminUser?.name || 'System',
          performedByEmail: adminUser?.email || '',
          changes: {},
          note: 'Initial plan seeded by system.',
          timestamp: new Date(),
        });
        console.log(`[SEED] Created Plan: ${planData.name} ($${planData.monthlyPrice}/mo)`);
      }

      const existingFeaturesCount = await PlanFeature.countDocuments({ planId: plan._id });
      if (existingFeaturesCount === 0 && planData.features) {
        const featureDocs = planData.features.map((f, idx) => ({
          planId: plan!._id,
          label: f.label,
          included: f.included,
          order: idx,
        }));
        await PlanFeature.insertMany(featureDocs);
        console.log(`[SEED] Seeded ${featureDocs.length} features into PLAN_FEATURES for: ${plan.name}`);
      }
    }

    let regularUser = await User.findOne({ email: 'user@subpulse.io' });
    if (!regularUser) {
      regularUser = new User({
        name: 'Alex Morgan',
        email: 'user@subpulse.io',
        password: 'User@12345',
        role: userRole._id,
        company: 'Acme Cloud Systems',
        phone: '+1 (555) 234-5678',
      });
      await regularUser.save();
      console.log('[SEED] Created Demo User: user@subpulse.io (password: User@12345)');
    }

    let defaultCard = await UserCard.findOne({ userId: regularUser._id });
    if (!defaultCard) {
      defaultCard = await UserCard.create({
        userId: regularUser._id,
        holderName: regularUser.name,
        brand: 'Visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2028,
        isDefault: true,
      });
      console.log('[SEED] Created default Visa card for user@subpulse.io');
    }

    const existingSub = await Subscription.findOne({ userId: regularUser._id });
    if (!existingSub) {
      const proPlan = await Plan.findOne({ name: 'Professional' });
      if (proPlan) {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await Subscription.create({
          userId: regularUser._id,
          planId: proPlan._id,
          cardId: defaultCard._id,
          status: 'active',
          scheduleType: 'start_now',
          billingCycle: 'monthly',
          price: proPlan.monthlyPrice,
          currency: proPlan.currency || 'USD',
          startDate,
          endDate,
          cancelAtPeriodEnd: false,
        });
        console.log('[SEED] Created active subscription on Professional plan for user@subpulse.io');
      }
    }
  } catch (error) {
    console.error('[SEED] Error during database seeding:', error);
  }
};
