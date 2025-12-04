// src/routes/analyticsRoutes.js
import express from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticateAdmin, authenticateLead } from '../middleware/auth.js';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Track analytics event (public)
router.post(
  '/track',
  authenticateLead, // Optional authentication
  [
    body('type').isString(),
    body('page').optional().isString(),
    body('section').optional().isString(),
    body('element').optional().isString(),
    body('metadata').optional().isObject(),
    body('leadId').optional().isUUID(),
    body('packageId').optional().isUUID(),
    body('itineraryId').optional().isUUID(),
    body('addonId').optional().isUUID(),
  ],
  analyticsController.trackEvent
);

// Get analytics summary (admin only)
router.get(
  '/summary',
  authenticateAdmin,
  [
    query('days').optional().isInt({ min: 1, max: 365 }),
  ],
  analyticsController.getAnalyticsSummary
);

// Get funnel analytics (admin only)
router.get(
  '/funnel',
  authenticateAdmin,
  [
    query('days').optional().isInt({ min: 1, max: 365 }),
  ],
  analyticsController.getFunnelAnalytics
);

// Get real-time analytics (admin only)
router.get(
  '/realtime',
  authenticateAdmin,
  [
    query('minutes').optional().isInt({ min: 1, max: 60 }),
  ],
  analyticsController.getRealtimeAnalytics
);

// Get analytics for specific lead (admin only)
router.get(
  '/lead/:leadId',
  authenticateAdmin,
  [
    param('leadId').isUUID(),
    query('days').optional().isInt({ min: 1, max: 365 }),
  ],
  analyticsController.getAnalyticsByLead
);



// Get popular packages (admin only)
router.get(
  '/popular-packages',
  authenticateAdmin,
  [
    query('days').optional().isInt({ min: 1, max: 365 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  analyticsController.getPopularPackages
);



export default router;