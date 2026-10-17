import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { config } from './config/config.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { seedRolesAndAdmin } from './utils/seed.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js'
import planRoutes from './routes/plan.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import cardRoutes from './routes/card.routes.js';

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'SubPulse API is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/cards', cardRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Database Connection + Server Boot ────────────────────────────────────────
const startServer = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ [DB] Connected to MongoDB:', config.mongoUri);

    // Seed roles and default admin account on startup
    await seedRolesAndAdmin();

    app.listen(config.port, () => {
      console.log(`🚀 [SERVER] SubPulse API running on http://localhost:${config.port}`);
      console.log(`   Environment : ${config.nodeEnv}`);
      console.log(`   Client URL  : ${config.clientUrl}`);
    });
  } catch (error) {
    console.error('❌ [SERVER] Failed to start:', error);
    process.exit(1);
  }
};

startServer();
