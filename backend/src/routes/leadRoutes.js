// src/routes/leadRoutes.js
import express from 'express';
import { leadController } from '../controllers/leadController.js';
import { authenticateAdmin, authenticateLead } from '../middleware/auth.js';
import { leadCreateLimiter } from '../middleware/rateLimit.js';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Public routes (rate limited)
router.post(
  '/',
  leadCreateLimiter,
  authenticateLead, // Optional authentication
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional()
  .trim()
  .customSanitizer(v => v.replace(/\s+/g, ''))
  .bail()
  .isMobilePhone('any'),
    body('company').optional().trim(),
    body('source').optional().trim(),
    body('campaign').optional().trim(),
    body('emailOptIn').optional().isBoolean(),
  ],
  leadController.createLead
);

// Admin routes
router.get(
  '/',
  authenticateAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('eventId').optional().isUUID(),
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('search').optional().trim(),
    query('source').optional().trim(),
    query('campaign').optional().trim(),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'leadScore', 'name', 'email']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('includeQuotes').optional().isIn(['true', 'false']),
    query('includeConversations').optional().isIn(['true', 'false']),
  ],
  leadController.getLeads
);

router.get(
  '/export',
  authenticateAdmin,
  [
    query('status').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('format').optional().isIn(['csv', 'json']),
  ],
  leadController.exportLeads
);

router.patch(
  '/:id/status',
  authenticateAdmin,
  [
    param('id').isUUID(),
    body('status').isIn(['NEW', 'CONTACTED', 'QUOTE_SENT', 'INTERESTED', 'CLOSED_WON', 'CLOSED_LOST']),
    body('notes').optional().trim(),
    body('changedBy').optional().trim(),
  ],
  leadController.updateLeadStatus
);



export default router;