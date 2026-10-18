import { Schema, model, Document, Types } from 'mongoose';

export interface IPlanAuditLog extends Document {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  planName: string;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  performedBy: Types.ObjectId;
  performedByName: string;
  performedByEmail?: string;
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
  note?: string;
  timestamp: Date;
}

const planAuditLogSchema = new Schema<IPlanAuditLog>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'PLAN', required: true, index: true },
    planName: { type: String, required: true },
    action: { type: String, enum: ['created', 'updated', 'deleted', 'restored'], required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'USER', required: true },
    performedByName: { type: String, required: true },
    performedByEmail: { type: String, default: '' },
    changes: { type: Schema.Types.Mixed, default: {} },
    note: { type: String, default: '' },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  { collection: 'PLAN_AUDIT_LOGS' }
);

planAuditLogSchema.index({ planId: 1, timestamp: -1 });

export const PlanAuditLog = model<IPlanAuditLog>('PLAN_AUDIT_LOG', planAuditLogSchema, 'PLAN_AUDIT_LOGS');
