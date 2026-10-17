import { Schema, model, Document, Types } from 'mongoose';

export type SubscriptionStatus = 'active' | 'scheduled' | 'cancelled' | 'expired';
export type ScheduleType = 'start_now' | 'after_current_plan';
export type BillingCycle = 'monthly' | 'yearly';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  cardId?: Types.ObjectId;
  status: SubscriptionStatus;
  scheduleType: ScheduleType;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'USER',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'PLAN',
      required: true,
      index: true,
    },
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'USER_CARD',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'scheduled', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    scheduleType: {
      type: String,
      enum: ['start_now', 'after_current_plan'],
      default: 'start_now',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription = model<ISubscription>('SUBSCRIPTION', subscriptionSchema, 'SUBSCRIPTIONS');
