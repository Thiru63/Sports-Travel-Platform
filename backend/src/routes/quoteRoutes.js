// src/routes/quoteRoutes.js
import express from 'express';
import { quoteController } from '../controllers/quoteController.js';
import { authenticateAdmin, authenticateLead } from '../middleware/auth.js';
import { body, param, query} from 'express-validator';

const router = express.Router();


router.post(
  '/generate',
  authenticateAdmin,
  [
    body('leadId').isUUID(),
    body('eventId').isUUID(),
    body('packageId').isUUID(),
    body('addonIds').optional().isArray(),
    body('itinerariesIds').optional().isArray(),
    body('travellers').isInt({ min: 1, max: 50 }),
    body('travelDates')
      .isArray({ min: 2, max: 2 })
      .custom((dates) => {
        const [start, end] = dates;
        const startDate = new Date(start);
        const endDate = new Date(end);
        return startDate < endDate && startDate >= new Date();
      }),
    body('notes').optional().trim(),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'INR']),
  ],
  (req,res)=>quoteController.generateQuote(req,res)
);

router.get(
  '/',
  authenticateAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('leadId').optional().isUUID(),
    query('eventId').optional().isUUID(),
    query('packageId').optional().isUUID(),
    query('status').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('expiryBefore').optional().isISO8601(),
    query('expiryAfter').optional().isISO8601(),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['createdAt', 'expiryDate', 'finalPrice', 'travellers']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  quoteController.getQuotes
);



router.put(
  '/:id',
  authenticateAdmin,
  [
    param('id').isUUID(),
    body('notes').optional().trim(),
    body('status').optional().isIn(['SENT', 'VIEWED', 'ACCEPTED', 'EXPIRED', 'DECLINED']),
    body('finalPrice').optional().isFloat({ min: 0 }),
    body('addonsTotal').optional().isFloat({ min: 0 }),
    body('itinerariesTotal').optional().isFloat({ min: 0 }),
    body('subtotal').optional().isFloat({ min: 0 }),
    body('expiryDate').optional().isISO8601(),
    body('travelDates').optional().isArray({ min: 2, max: 2 }),
    body('addonIds').optional().isArray(),
    body('itinerariesIds').optional().isArray(),
    body('travellers').optional().isInt({ min: 1, max: 50 }),
    body('calculationNotes').optional().trim(),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'INR']),
  ],
  quoteController.updateQuote
);

router.delete(
  '/:id',
  authenticateAdmin,
  [param('id').isUUID()],
  quoteController.deleteQuote
);






export default router;