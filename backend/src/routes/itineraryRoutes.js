// src/routes/itineraryRoutes.js
import express from 'express';
import { itineraryController } from '../controllers/itineraryController.js';
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
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  itineraryController.getItineraries
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
    body('dayNumber').isInt({ min: 1 }),
    body('activities').optional().isArray(),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('duration').optional().isInt({ min: 1 }),
    body('image').optional().isURL(),
    body('startDay').optional().isInt({ min: 1 }),
    body('endDay').optional().isInt({ min: 1 }),
  ],
  itineraryController.createItinerary
);

router.put(
  '/:id',
  authenticateAdmin,
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('dayNumber').optional().isInt({ min: 1 }),
    body('activities').optional().isArray(),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('duration').optional().isInt({ min: 1 }),
    body('image').optional().isURL(),
    body('startDay').optional().isInt({ min: 1 }),
    body('endDay').optional().isInt({ min: 1 }),
    body('packageIds').optional().isArray(),
  ],
  itineraryController.updateItinerary
);

router.delete(
  '/:id',
  authenticateAdmin,
  [param('id').isUUID()],
  itineraryController.deleteItinerary
);

export default router;