// tests/unit/itineraryController.test.js
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

describe('Itinerary Controller', () => {
  describe('GET /api/itineraries - Get Itineraries', () => {
    test('should return itineraries for event', async () => {
      const response = await request(app)
        .get('/api/itineraries')
        .query({ eventId: '223e4567-e89b-12d3-a456-426614174000' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});