import { Schema, model, Document, Types } from 'mongoose';

export type RoleName = 'admin' | 'user';

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: RoleName;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['admin', 'user'],
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Role = model<IRole>('ROLE', roleSchema, 'ROLE');
