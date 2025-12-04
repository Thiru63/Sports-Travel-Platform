// src/routes/packageRoutes.js
import express from 'express';
import { packageController } from '../controllers/packageController.js';
import { authenticateAdmin, authenticateLead } from '../middleware/auth.js';
import { query, param, body } from 'express-validator';

const router = express.Router();

// Public routes
router.get(
  '/',
  authenticateLead,
  [
    query('eventId').optional().isUUID(),
    query('category').optional().trim(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('isFeatured').optional().isIn(['true', 'false']),
    query('upcoming').optional().isIn(['true', 'false']),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['basePrice', 'createdAt', 'title']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  packageController.getPackages
);



// Admin routes
router.post(
  '/',
  authenticateAdmin,
  [
    body('eventId').isUUID(),
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('basePrice').isFloat({ min: 0 }),
    body('dynamicPrice').optional().isFloat({ min: 0 }),
    body('includes').optional().isArray(),
    body('excludes').optional().isArray(),
    body('location').optional().trim(),
    body('eventDate').optional().isISO8601(),
    body('category').optional().trim(),
    body('image').optional().isURL(),
    body('maxCapacity').optional().isInt({ min: 1 }),
    body('minCapacity').optional().isInt({ min: 1 }),
    body('isFeatured').optional().isBoolean(),
    body('isEarlyBird').optional().isBoolean(),
    body('earlyBirdCutoff').optional().isISO8601(),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'INR']),
    body('slug').optional().trim(),
  ],
  packageController.createPackage
);

router.put(
  '/:id',
  authenticateAdmin,
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('dynamicPrice').optional().isFloat({ min: 0 }),
    body('includes').optional().isArray(),
    body('excludes').optional().isArray(),
    body('location').optional().trim(),
    body('eventDate').optional().isISO8601(),
    body('category').optional().trim(),
    body('image').optional().isURL(),
    body('maxCapacity').optional().isInt({ min: 1 }),
    body('minCapacity').optional().isInt({ min: 1 }),
    body('isFeatured').optional().isBoolean(),
    body('isEarlyBird').optional().isBoolean(),
    body('earlyBirdCutoff').optional().isISO8601(),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'INR']),
  ],
  packageController.updatePackage
);

router.delete(
  '/:id',
  authenticateAdmin,
  [param('id').isUUID()],
  packageController.deletePackage
);

export default router;