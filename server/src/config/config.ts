import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded whether running from workspace root or server directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();


export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/subpulse_db',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'subpulse_access_secret_key_default',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'subpulse_refresh_secret_key_default',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  adminSeed: {
    name: process.env.ADMIN_NAME || 'System Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@subpulse.io',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    company: process.env.ADMIN_COMPANY || 'SubPulse Systems HQ',
  },
};
