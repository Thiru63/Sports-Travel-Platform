// src/app.js - UPDATED
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import config from './config/index.js';

// Import routes
import leadRoutes from './routes/leadRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import itineraryRoutes from './routes/itineraryRoutes.js';
import addonRoutes from './routes/addonRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import { trackAnalytics } from './middleware/analytics.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin === '*' ? '*' : config.cors.origin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { 
    stream: { write: message => logger.info(message.trim()) } 
  }));
}

// Rate limiting
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
  skip: (req) => req.path.startsWith('/api/admin'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' },
  skip: (req) => !req.path.includes('/login') && !req.path.includes('/auth'),
});

app.use(publicLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/admin/create', authLimiter);

// Analytics tracking middleware
app.use(trackAnalytics);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '3.0.0',
    services: {
      api: 'running',
      database: 'connected', // You should add actual DB check
      ai: process.env.GROQ_API_KEY ? 'available' : 'disabled',
      email: process.env.EMAIL_USER ? 'available' : 'disabled',
    },
  });
});

// API Documentation
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Sports Travel Platform API v3.0',
    version: '3.0.0',
    description: 'Complete backend for sports travel platform with AI, CRM, analytics, and full workflow',
    endpoints: {
      public: {
        'GET /api/events': 'Browse events',
        'GET /api/packages': 'Browse packages',
        'GET /api/itineraries': 'Browse itineraries',
        'GET /api/addons': 'Browse add-ons',
        'POST /api/leads': 'Create lead',
        'POST /api/quotes/generate': 'Generate quote',
        'POST /api/ai/chat': 'AI assistant',
        'POST /api/analytics/track': 'Track analytics',
      },
      authenticated: {
        'GET /api/leads/:id': 'Get lead details',
        'GET /api/quotes/lead/:leadId': 'Get lead quotes',
        'GET /api/ai/conversations': 'Get chat history',
      },
      admin: {
        'POST /api/admin/login': 'Admin login',
        'GET /api/admin/dashboard/stats': 'Dashboard stats',
        'GET /api/leads': 'Manage leads',
        'PATCH /api/leads/:id/status': 'Update lead status',
        'CRUD /api/events': 'Manage events',
        'CRUD /api/packages': 'Manage packages',
        'CRUD /api/itineraries': 'Manage itineraries',
        'CRUD /api/addons': 'Manage add-ons',
        'GET /api/admin/export': 'Export data',
        'POST /api/admin/ai/chat': 'Admin AI assistant',
        'GET /api/analytics/summary': 'Analytics dashboard',
      },
    },
    authentication: {
      jwt: 'Authorization: Bearer <token>',
      api_key: 'X-API-Key: sk_<key>',
      note: 'Admin endpoints require JWT or API key',
    },
    pricing_logic: 'Seasonal multipliers, early bird discounts, group discounts, weekend surcharges',
    contact: 'support@sports-travel.com',
    documentation: 'https://docs.sports-travel.com',
  });
});

// API routes
app.use(`${config.api.prefix}/leads`, leadRoutes);
app.use(`${config.api.prefix}/events`, eventRoutes);
app.use(`${config.api.prefix}/packages`, packageRoutes);
app.use(`${config.api.prefix}/itineraries`, itineraryRoutes);
app.use(`${config.api.prefix}/addons`, addonRoutes);
app.use(`${config.api.prefix}/quotes`, quoteRoutes);
app.use(`${config.api.prefix}/admin`, adminRoutes);
app.use(`${config.api.prefix}/ai`, aiRoutes);
app.use(`${config.api.prefix}/analytics`, analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found`,
    suggestion: 'Check / for API documentation',
  });
});

// Global error handler
app.use(errorHandler);

export default app;