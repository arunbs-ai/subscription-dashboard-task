import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Full name is required.',
    'string.min': 'Full name must be at least 2 characters.',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 8 characters long.',
  }),
  company: Joi.string().trim().allow('').optional(),
  phone: Joi.string().trim().allow('').optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required.',
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required.',
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required.',
  }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    'string.empty': 'New password is required.',
    'string.min': 'New password must be at least 8 characters long.',
  }),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  company: Joi.string().trim().allow('').optional(),
  phone: Joi.string().trim().allow('').optional(),
});
