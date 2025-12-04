// src/utils/database.js
import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Only auto-connect in non-test environments
if (process.env.NODE_ENV !== 'test') {
  prisma.$connect()
    .then(() => {
      logger.info('✅ Database connected successfully');
    })
    .catch((error) => {
      logger.error('❌ Database connection failed:', error);
      process.exit(1);
    });
} else {
  // Optional: Provide info for tests
  logger.warn('⚠️ Skipping prisma.$connect() in test environment');
}

// Graceful shutdown (keep these)
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
});
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
});

export default prisma;
