import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();

const env = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}. Add it to server/.env`);
  }
  return value;
};

export const config = {
  port: Number(env('PORT')),
  nodeEnv: env('NODE_ENV'),
  clientUrl: env('CLIENT_URL'),
  mongoUri: env('MONGODB_URI'),
  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET'),
    accessExpiresIn: env('JWT_ACCESS_EXPIRES_IN'),
    refreshSecret: env('JWT_REFRESH_SECRET'),
    refreshExpiresIn: env('JWT_REFRESH_EXPIRES_IN'),
  },
  security: {
    bodyLimit: env('BODY_LIMIT'),
    trustProxy: Number(env('TRUST_PROXY')),
    rateLimitWindowMs: Number(env('RATE_LIMIT_WINDOW_MS')),
    rateLimitMax: Number(env('RATE_LIMIT_MAX')),
    authRateLimitMax: Number(env('AUTH_RATE_LIMIT_MAX')),
  },
  adminSeed: {
    name: env('ADMIN_NAME'),
    email: env('ADMIN_EMAIL'),
    password: env('ADMIN_PASSWORD'),
    company: env('ADMIN_COMPANY'),
  },
};
