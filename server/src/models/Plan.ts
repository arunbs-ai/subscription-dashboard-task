import { Schema, model, Document, Types } from 'mongoose';

export interface IPlanFeature {
  label: string;
  included: boolean;
}

export interface IPlan extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'both';
  features: IPlanFeature[];
  tier: 'starter' | 'pro' | 'enterprise';
  apiRequests: number;
  maxUsers: number;
  maxProjects: number;
  storageGB: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  isFeatured: boolean;
  trialDays: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, required: true, trim: true },
    monthlyPrice: { type: Number, required: true, min: 0 },
    yearlyPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true, trim: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'both'], default: 'both' },
    features: [{ label: { type: String, required: true }, included: { type: Boolean, default: true } }],
    tier: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'pro' },
    apiRequests: { type: Number, default: 50000, min: 0 },
    maxUsers: { type: Number, default: 1, min: 1 },
    maxProjects: { type: Number, default: 1 },
    storageGB: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

planSchema.index({ isActive: 1, isDeleted: 1, sortOrder: 1 });

export const Plan = model<IPlan>('PLAN', planSchema, 'PLAN');
