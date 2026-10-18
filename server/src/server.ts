import express from 'express';
import mongoose from 'mongoose';
import { config } from './config/config.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { applySecurity, applyInputProtection, notFoundHandler } from './middlewares/security.middleware.js';
import { seedRolesAndAdmin } from './utils/seed.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js'
import planRoutes from './routes/plan.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import cardRoutes from './routes/card.routes.js';

const app = express();

applySecurity(app);
applyInputProtection(
  app,
  express.json({ limit: config.security.bodyLimit }),
  express.urlencoded({ extended: true, limit: config.security.bodyLimit })
);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'ABS Nexora API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/cards', cardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[DB] Connected to MongoDB:', config.mongoUri);

    await seedRolesAndAdmin();

    app.listen(config.port, () => {
      console.log(`[SERVER] ABS Nexora API running on http://localhost:${config.port}`);
      console.log(`   Environment : ${config.nodeEnv}`);
      console.log(`   Client URL  : ${config.clientUrl}`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start:', error);
    process.exit(1);
  }
};

startServer();
