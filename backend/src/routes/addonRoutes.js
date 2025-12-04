// src/routes/addonRoutes.js
import express from 'express';
import { addonController } from '../controllers/addonController.js';
import { authenticateAdmin, authenticateLead } from '../middleware/auth.js';
import { query, param, body } from 'express-validator';

const router = express.Router();

// Public routes
router.get(
  '/',
  authenticateLead,
  [
    query('eventId').optional().isUUID(),
    query('packageId').optional().isUUID(),
    query('category').optional().trim(),
    query('isOptional').optional().isIn(['true', 'false']),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  addonController.getAddons
);



// Admin routes
router.post(
  '/',
  authenticateAdmin,
  [
    body('eventId').optional().isUUID(),
    body('packageIds').optional().isArray(),
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'INR']),
    body('isOptional').optional().isBoolean(),
    body('image').optional().isURL(),
    body('category').optional().trim(),
  ],
  addonController.createAddon
);

router.put(
  '/:id',
  authenticateAdmin,
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('price').optional().isFloat({ min: 0 }),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'INR']),
    body('isOptional').optional().isBoolean(),
    body('image').optional().isURL(),
    body('category').optional().trim(),
    body('packageIds').optional().isArray(),
  ],
  addonController.updateAddon
);

router.delete(
  '/:id',
  authenticateAdmin,
  [param('id').isUUID()],
  addonController.deleteAddon
);

export default router;