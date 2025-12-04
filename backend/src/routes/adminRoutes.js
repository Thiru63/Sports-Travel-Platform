// src/routes/adminRoutes.js
import express from 'express';
import { adminController } from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Authentication routes
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  adminController.login
);

router.post(
  '/create',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 2 }),
  ],
  adminController.createAdmin
);

// API Key management
router.post(
  '/api-keys/generate',
  authenticateAdmin,
  [
    body('name').trim().isLength({ min: 3 }),
    body('expiresInDays').optional().isInt({ min: 1 }),
    body('ipWhitelist').optional().isArray(),
  ],
  adminController.generateApiKey
);




export default router;