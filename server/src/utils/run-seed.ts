import mongoose from 'mongoose';
import { config } from '../config/config.js';
import { seedRolesAndAdmin } from './seed.js';

const run = async (): Promise<void> => {
  try {
    console.log('[SEED] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('[SEED] Connected to MongoDB:', config.mongoUri);

    await seedRolesAndAdmin();

    console.log('\n[SEED] Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('[SEED] Failed:', error);
    process.exit(1);
  }
};

run();
