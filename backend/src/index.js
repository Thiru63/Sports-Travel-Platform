// src/index.js (UPDATED)
import app from './app.js';
import config from './config/index.js';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();
const PORT = config.port || 3000;

// Test database connection
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      
      if (config.nodeEnv === 'development') {
        console.log('\n🎯 Available endpoints:');
        console.log(`   POST   http://localhost:${PORT}/api/leads`);
        console.log(`   GET    http://localhost:${PORT}/api/events`);
        console.log(`   POST   http://localhost:${PORT}/api/quotes/generate`);
        console.log(`   GET    http://localhost:${PORT}/health\n`);
      }
    });
  })
  .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Received shutdown signal');
  
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);