import Joi from 'joi';

const nameField = Joi.string()
  .max(50)
  .pattern(/^[A-Za-z]+( [A-Za-z]+)*$/)
  .messages({
    'string.empty': 'Name is required.',
    'string.max': 'Name must be at most 50 characters.',
    'string.pattern.base':
      'Name can contain alphabets only, with no leading/trailing space and a single space between words.',
  });

const companyField = Joi.string()
  .max(50)
  .pattern(/^[^\s]+( [^\s]+)*$/)
  .allow('')
  .messages({
    'string.max': 'Company must be at most 50 characters.',
    'string.pattern.base':
      'Company must not start/end with a space and may have only a single space between words.',
  });

const emailField = Joi.string()
  .trim()
  .lowercase()
  .max(254)
  .pattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/)
  .messages({
    'string.empty': 'Email is required.',
    'string.pattern.base': 'Please enter a valid email address.',
  });

const phoneField = Joi.string()
  .pattern(/^\+\d{1,4} \d{6,15}$/)
  .allow('')
  .messages({ 'string.pattern.base': 'Please enter a valid phone number with country code.' });

const passwordField = Joi.string()
  .min(8)
  .max(20)
  .pattern(/^\S+$/, 'no-spaces')
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[0-9]/, 'number')
  .pattern(/[^A-Za-z0-9]/, 'special')
  .messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 8 characters long.',
    'string.max': 'Password must be at most 20 characters long.',
    'string.pattern.name':
      'Password must not contain spaces and must include a lowercase letter, an uppercase letter, a number and a special character.',
  });

export const registerSchema = Joi.object({
  name: nameField.required(),
  email: emailField.required(),
  password: passwordField.required(),
  company: companyField.optional(),
  phone: phoneField.optional(),
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
  newPassword: passwordField.required(),
});

export const updateProfileSchema = Joi.object({
  name: nameField.optional(),
  email: emailField.optional(),
  company: companyField.optional(),
  phone: phoneField.optional(),
});
