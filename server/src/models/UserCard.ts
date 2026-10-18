import { Schema, model, Document, Types } from 'mongoose';

export interface IUserCard extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  holderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userCardSchema = new Schema<IUserCard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'USER', required: true, index: true },
    holderName: { type: String, required: true, trim: true },
    brand: { type: String, default: 'Visa', enum: ['Visa', 'Mastercard', 'Amex', 'Discover', 'RuPay', 'Card', 'Other'] },
    last4: { type: String, required: true, length: 4 },
    expMonth: { type: Number, required: true, min: 1, max: 12 },
    expYear: { type: Number, required: true, min: 2024, max: 2045 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userCardSchema.index({ userId: 1, isDefault: 1 });

export const UserCard = model<IUserCard>('USER_CARD', userCardSchema, 'USER_CARDS');
