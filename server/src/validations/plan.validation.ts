import Joi from 'joi';

const featureSchema = Joi.object({
  label: Joi.string().trim().min(1).max(200).required(),
  included: Joi.boolean().default(true),
});

// ─── Create Plan ──────────────────────────────────────────────────────────────
export const createPlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Plan name is required.',
    'string.min': 'Plan name must be at least 2 characters.',
    'any.required': 'Plan name is required.',
  }),
  description: Joi.string().trim().min(5).max(500).required().messages({
    'string.empty': 'Plan description is required.',
    'any.required': 'Plan description is required.',
  }),
  monthlyPrice: Joi.number().min(0).required().messages({
    'number.min': 'Monthly price cannot be negative.',
    'any.required': 'Monthly price is required.',
  }),
  yearlyPrice: Joi.number().min(0).required().messages({
    'number.min': 'Yearly price cannot be negative.',
    'any.required': 'Yearly price is required.',
  }),
  currency: Joi.string().trim().uppercase().max(5).default('USD'),
  billingCycle: Joi.string().valid('monthly', 'yearly', 'both').default('both'),
  features: Joi.array().items(featureSchema).min(1).required().messages({
    'array.min': 'At least one feature is required.',
    'any.required': 'Features are required.',
  }),
  maxUsers: Joi.number().integer().min(1).default(1),
  maxProjects: Joi.number().integer().min(1).default(1),
  storageGB: Joi.number().min(0).default(5),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  trialDays: Joi.number().integer().min(0).default(0),
  sortOrder: Joi.number().integer().min(0).default(0),
  note: Joi.string().trim().allow('').optional(),
});

// ─── Update Plan ──────────────────────────────────────────────────────────────
export const updatePlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().min(5).max(500).optional(),
  monthlyPrice: Joi.number().min(0).optional(),
  yearlyPrice: Joi.number().min(0).optional(),
  currency: Joi.string().trim().uppercase().max(5).optional(),
  billingCycle: Joi.string().valid('monthly', 'yearly', 'both').optional(),
  features: Joi.array().items(featureSchema).min(1).optional(),
  maxUsers: Joi.number().integer().min(1).optional(),
  maxProjects: Joi.number().integer().min(1).optional(),
  storageGB: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  trialDays: Joi.number().integer().min(0).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  note: Joi.string().trim().allow('').optional(),
}).min(1).messages({
  'object.min': 'At least one field is required to update.',
});
