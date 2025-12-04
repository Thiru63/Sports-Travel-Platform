import request from 'supertest';
import app from '../../src/app.js';

// Mock authentication middleware
jest.mock('../../src/middleware/auth.js', () => ({
  authenticateAdmin: jest.fn((req, res, next) => {
    req.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
    next();
  }),
  authenticateLead: jest.fn((req, res, next) => next()),
}));

describe('Quote API Integration', () => {
  describe('POST /api/quotes/generate', () => {
    it('should generate a quote with valid data', async () => {
      const quoteData = {
        leadId: 'lead-test-123',
        eventId: 'event-test-123',
        packageId: 'package-test-123',
        travellers: 4,
        travelDates: ['2024-12-01', '2024-12-03'],
        notes: 'Test quote request',
        currency: 'USD',
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .set('Authorization', 'Bearer mock-token')
        .send(quoteData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Quote generated successfully',
          data: expect.objectContaining({
            quote: expect.objectContaining({
              id: expect.any(String),
              leadId: 'lead-test-123',
              eventId: 'event-test-123',
              packageId: 'package-test-123',
              travellers: 4,
              finalPrice: expect.any(Number),
            }),
            pricingBreakdown: expect.objectContaining({
              basePrice: expect.any(Number),
              finalPrice: expect.any(Number),
              currency: 'USD',
            }),
          }),
        })
      );
    });

    it('should return 400 for invalid travel dates', async () => {
      const invalidData = {
        leadId: 'lead-123',
        eventId: 'event-123',
        packageId: 'package-123',
        travellers: 2,
        travelDates: ['2024-12-03', '2024-12-01'], // End before start
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveErrorStructure();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        leadId: 'lead-123',
        // Missing eventId, packageId, etc.
      };

      const response = await request(app)
        .post('/api/quotes/generate')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/quotes', () => {
    it('should return quotes with pagination', async () => {
      const response = await request(app)
        .get('/api/quotes?page=1&limit=10')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
            pages: expect.any(Number),
          }),
        })
      );
    });

    it('should filter quotes by lead ID', async () => {
      const response = await request(app)
        .get('/api/quotes?leadId=lead-test-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data.every(q => q.leadId === 'lead-test-123')).toBe(true);
    });

    it('should filter quotes by price range', async () => {
      const response = await request(app)
        .get('/api/quotes?minPrice=500&maxPrice=2000')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data.every(q => 
        q.finalPrice >= 500 && q.finalPrice <= 2000
      )).toBe(true);
    });
  });
});