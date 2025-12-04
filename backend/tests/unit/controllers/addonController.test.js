// tests/unit/addonController.test.js
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/app.js';

describe('Addon Controller', () => {
  describe('GET /api/addons - Get Addons', () => {
    test('should return addons for event', async () => {
      const response = await request(app)
        .get('/api/addons')
        .query({ eventId: '223e4567-e89b-12d3-a456-426614174000' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});
