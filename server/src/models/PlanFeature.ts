import { Schema, model, Document, Types } from 'mongoose';

export interface IPlanFeature extends Document {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  label: string;
  included: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const planFeatureSchema = new Schema<IPlanFeature>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'PLAN',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    included: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

planFeatureSchema.index({ planId: 1, order: 1 });

export const PlanFeature = model<IPlanFeature>('PLAN_FEATURE', planFeatureSchema, 'PLAN_FEATURES');
