import express from 'express';
import { aiController } from '../controllers/aiController.js';
import { authenticateAdmin, authenticateLead } from '../middleware/auth.js';
import { body, query, param } from 'express-validator';

const router = express.Router();

// ===========================================================
// PUBLIC ROUTES (No authentication required)
// ===========================================================

// Lead AI Chat (IP-based)
router.post(
  '/chat',
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message must be between 1 and 2000 characters'),
  ],
  aiController.leadChat
);

// ===========================================================
// AUTHENTICATED LEAD ROUTES
// ===========================================================

// Get lead chat history by IP (for leads to view their own history)
router.get(
  '/history',
  authenticateLead,
  aiController.getLeadChatHistoryByIp
);

// ===========================================================
// ADMIN ROUTES
// ===========================================================

// Admin AI Chat
router.post(
  '/admin/chat',
  authenticateAdmin,
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Message must be between 1 and 5000 characters'),
  ],
  aiController.adminChat
);

// Get admin chat history by admin id (Lead ID) (Admin only)
router.get(
  '/history/lead/:leadId',
  authenticateAdmin,
  [
    param('leadId').isUUID().withMessage('Valid Lead ID is required'),
  ],
  aiController.getLeadChatHistoryByLeadId
);

// Get all AI conversations (Admin only - for dashboard)
router.get(
  '/conversations',
  authenticateAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('leadId').optional().isUUID().withMessage('Valid Lead ID is required'),
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
    query('intent').optional().isString().withMessage('Intent must be a string'),
    query('type').optional().isString().withMessage('Type must be a string'),
  ],
  aiController.getAllAiConversations
);





export default router;