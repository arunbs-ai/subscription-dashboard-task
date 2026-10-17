export type Role = 'user' | 'admin';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled';

export type BillingCycle = 'monthly' | 'yearly';

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  company?: string;
  phone?: string;
  createdAt: string;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────
export type PlanFeature =
  | string
  | {
      label: string;
      included: boolean;
    };

export interface PlanLimits {
  teamMembers?: number;
  storageGB?: number;
  projects?: number;
  apiRequests?: number;
}

export interface Plan {
  _id?: string;
  id?: string; // alias
  name: string;
  tier?: 'starter' | 'pro' | 'enterprise' | string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency?: string;
  billingCycle?: 'monthly' | 'yearly' | 'both';
  features: PlanFeature[];
  maxUsers?: number;
  maxProjects?: number;
  storageGB?: number;
  limits?: PlanLimits;
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  isFeatured?: boolean;
  popular?: boolean;
  trialDays?: number;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Plan Audit ───────────────────────────────────────────────────────────────
export interface PlanAuditLog {
  _id: string;
  planId: string;
  planName: string;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  performedBy: string;
  performedByName: string;
  performedByEmail: string;
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
  note?: string;
  timestamp: string;
}

export type ScheduleType = 'start_now' | 'after_current_plan';

// ─── User Card ────────────────────────────────────────────────────────────────
export interface UserCard {
  _id: string;
  id?: string;
  userId?: string;
  holderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt?: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'failed';
  pdfUrl?: string;
}

// ─── User Subscription ────────────────────────────────────────────────────────
export interface UserSubscription {
  _id?: string;
  id?: string;
  planId: string;
  planName?: string;
  tier?: string;
  status: SubscriptionStatus;
  scheduleType?: ScheduleType;
  billingCycle: BillingCycle;
  price: number;
  startDate?: string;
  endDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cardId?: UserCard | any;
  plan?: Plan;
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  usage?: {
    teamMembers: { used: number; limit: number };
    storageGB: { used: number; limit: number };
    projects: { used: number; limit: number };
    apiRequests?: { used: number; limit: number };
  };
  invoices?: Invoice[];
}

// ─── Admin Subscription Record ────────────────────────────────────────────────
export interface AdminSubscriptionRecord {
  _id?: string;
  id?: string;
  tier?: string;
  scheduleType?: ScheduleType;
  userId?: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    avatar?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    company?: string;
    avatar?: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
    company?: string;
    avatar?: string;
  };
  planId?: {
    _id?: string;
    id?: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    maxUsers?: number;
    storageGB?: number;
  };
  cardId?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  planName?: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  price?: number;
  amount?: number;
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  cancelAtPeriodEnd: boolean;
  createdAt?: string;
}

export interface AdminMetrics {
  totalRevenueMonthly?: number;
  totalSubscribers: number;
  activeSubscriptions?: number;
  activeCount?: number;
  scheduledCount?: number;
  cancelledCount?: number;
  churnRatePercent?: number;
  monthlyGrowthPercent?: number;
  mrr?: number;
}

