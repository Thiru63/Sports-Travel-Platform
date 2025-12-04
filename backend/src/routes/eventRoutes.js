// src/routes/eventRoutes.js
import express from 'express';
import { eventController } from '../controllers/eventController.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { query, param, body } from 'express-validator';

const router = express.Router();

// Public routes
router.get(
  '/',
  [
    query('active').optional().isIn(['true', 'false']),
    query('category').optional().trim(),
    query('upcoming').optional().isIn(['true', 'false']),
    query('featured').optional().isIn(['true', 'false']),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['startDate', 'createdAt', 'title']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  eventController.getEvents
);


router.get(
  '/:id/packages',
  [
    param('id').isUUID(),
    query('featured').optional().isIn(['true', 'false']),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('category').optional().trim(),
    query('sortBy').optional().isIn(['basePrice', 'createdAt', 'title']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  eventController.getEventPackages
);

// Admin routes
router.post(
  '/',
  authenticateAdmin,
  [
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('location').trim().isLength({ min: 2, max: 100 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('image').optional().isURL(),
    body('category').optional().trim(),
    body('seasonMonths').optional().isArray(),
    body('isWeekend').optional().isBoolean(),
    body('slug').optional().trim().isLength({ min: 3, max: 100 }),
    body('seoTitle').optional().trim(),
    body('seoDescription').optional().trim(),
    body('tags').optional().isArray(),
  ],
  eventController.createEvent
);

router.put(
  '/:id',
  authenticateAdmin,
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('location').optional().trim().isLength({ min: 2, max: 100 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('image').optional().isURL(),
    body('category').optional().trim(),
    body('seasonMonths').optional().isArray(),
    body('isWeekend').optional().isBoolean(),
    body('slug').optional().trim().isLength({ min: 3, max: 100 }),
    body('seoTitle').optional().trim(),
    body('seoDescription').optional().trim(),
    body('tags').optional().isArray(),
    body('isActive').optional().isBoolean(),
  ],
  eventController.updateEvent
);

router.delete(
  '/:id',
  authenticateAdmin,
  [param('id').isUUID()],
  eventController.deleteEvent
);

export default router;