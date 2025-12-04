import { quoteController } from '../../../src/controllers/quoteController.js';

describe('QuoteController', () => {
  let prisma;
  let pricingService;
  let emailService;

  beforeEach(() => {
    prisma = global.mockPrisma();
    pricingService = require('../../../src/services/pricingService.js').default;
    emailService = require('../../../src/services/emailService.js').default;
    jest.clearAllMocks();
  });

  describe('generateQuote', () => {
    const mockLead = {
      id: 'lead-123',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'NEW',
    };

    const mockEvent = {
      id: 'event-123',
      title: 'F1 Grand Prix',
      startDate: new Date('2024-12-01'),
      seasonMonths: [12],
      isWeekend: true,
    };

    const mockPackage = {
      id: 'package-123',
      title: 'VIP Package',
      basePrice: 1000,
      eventId: 'event-123',
      event: mockEvent,
      minCapacity: 1,
      earlyBirdCutoff: null,
    };

    const mockPricing = {
      basePrice: 1000,
      seasonalMultiplier: 0.2,
      seasonalAdjustment: 200,
      earlyBirdDiscount: 0.1,
      earlyBirdAdjustment: 100,
      lastMinuteSurcharge: 0,
      lastMinuteAdjustment: 0,
      groupDiscount: 0.08,
      groupAdjustment: 80,
      weekendSurcharge: 0.08,
      weekendAdjustment: 80,
      subtotal: 1100,
      daysUntilEvent: 120,
      includesWeekend: true,
    };

    it('should generate a quote successfully', async () => {
      const req = global.mockRequest({
        body: {
          leadId: 'lead-123',
          eventId: 'event-123',
          packageId: 'package-123',
          travellers: 4,
          travelDates: ['2024-12-06', '2024-12-08'],
          notes: 'Test quote',
          currency: 'USD',
        },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.package.findUnique.mockResolvedValue(mockPackage);
      prisma.addOn.findMany.mockResolvedValue([]);
      prisma.itinerary.findMany.mockResolvedValue([]);
      pricingService.calculateQuote.mockResolvedValue(mockPricing);
      prisma.quote.create.mockResolvedValue({
        id: 'quote-123',
        leadId: 'lead-123',
        eventId: 'event-123',
        packageId: 'package-123',
        addonIds: [],
        itinerariesIds: [],
        basePrice: 1000,
        finalPrice: 1100,
        travellers: 4,
        travelDates: [new Date('2024-12-06'), new Date('2024-12-08')],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        calculationNotes: 'Test notes',
        lead: mockLead,
        event: mockEvent,
        package: mockPackage,
      });
      prisma.lead.update.mockResolvedValue({});
      prisma.leadStatusHistory.create.mockResolvedValue({});
      emailService.sendQuoteEmail.mockResolvedValue(true);

      await quoteController.generateQuote(req, res);

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
      });
      expect(pricingService.calculateQuote).toHaveBeenCalled();
      expect(prisma.quote.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
     

    it('should include addons and itineraries in calculation', async () => {
      const req = global.mockRequest({
        body: {
          leadId: 'lead-123',
          eventId: 'event-123',
          packageId: 'package-123',
          travellers: 2,
          travelDates: ['2024-12-01', '2024-12-03'],
          addonIds: ['addon-1', 'addon-2'],
          itinerariesIds: ['itinerary-1'],
        },
      });
      const res = global.mockResponse();

      const mockAddons = [
        { id: 'addon-1', price: 100 },
        { id: 'addon-2', price: 200 },
      ];
      const mockItineraries = [
        { id: 'itinerary-1', basePrice: 150 },
      ];

      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.package.findUnique.mockResolvedValue(mockPackage);
      prisma.addOn.findMany.mockResolvedValue(mockAddons);
      prisma.itinerary.findMany.mockResolvedValue(mockItineraries);
      pricingService.calculateQuote.mockResolvedValue({
        ...mockPricing,
        subtotal: 1000,
      });
      prisma.quote.create.mockResolvedValue({
        id: 'quote-123',
        finalPrice: 1450, // 1000 + 300 (addons) + 150 (itinerary)
      });

      await quoteController.generateQuote(req, res);

      const quoteCreateCall = prisma.quote.create.mock.calls[0][0];
      expect(quoteCreateCall.data.addonIds).toEqual(['addon-1', 'addon-2']);
      expect(quoteCreateCall.data.itinerariesIds).toEqual(['itinerary-1']);
      expect(quoteCreateCall.data.addonsTotal).toBe(300);
      expect(quoteCreateCall.data.itinerariesTotal).toBe(150);
      expect(quoteCreateCall.data.finalPrice).toBe(1450);
    });

    it('should validate package belongs to event', async () => {
      const req = global.mockRequest({
        body: {
          leadId: 'lead-123',
          eventId: 'event-123',
          packageId: 'package-wrong',
          travellers: 2,
          travelDates: ['2024-12-01', '2024-12-03'],
        },
      });
      const res = global.mockResponse();

      const wrongPackage = {
        ...mockPackage,
        eventId: 'different-event',
      };

      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.package.findUnique.mockResolvedValue(wrongPackage);

      await quoteController.generateQuote(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Package does not belong to the specified event',
        })
      );
    });

    it('should return 404 when lead not found', async () => {
      const req = global.mockRequest({
        body: {
          leadId: 'non-existent',
          eventId: 'event-123',
          packageId: 'package-123',
          travellers: 2,
          travelDates: ['2024-12-01', '2024-12-03'],
        },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue(null);

      await quoteController.generateQuote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Lead not found',
        })
      );
    });

    it('should handle pricing service errors', async () => {
      const req = global.mockRequest({
        body: {
          leadId: 'lead-123',
          eventId: 'event-123',
          packageId: 'package-123',
          travellers: 2,
          travelDates: ['2024-12-01', '2024-12-03'],
        },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.package.findUnique.mockResolvedValue(mockPackage);
      pricingService.calculateQuote.mockRejectedValue(new Error('Pricing error'));

      await quoteController.generateQuote(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to generate quote',
        })
      );
    });

    it('should send email when lead has email', async () => {
      const req = global.mockRequest({
        body: {
          leadId: 'lead-123',
          eventId: 'event-123',
          packageId: 'package-123',
          travellers: 2,
          travelDates: ['2024-12-01', '2024-12-03'],
        },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.package.findUnique.mockResolvedValue(mockPackage);
      pricingService.calculateQuote.mockResolvedValue(mockPricing);
      prisma.quote.create.mockResolvedValue({
        id: 'quote-123',
        lead: mockLead,
        package: mockPackage,
        event: mockEvent,
      });
      emailService.sendQuoteEmail.mockResolvedValue(true);

      await quoteController.generateQuote(req, res);

      expect(emailService.sendQuoteEmail).toHaveBeenCalledWith(
        'john@example.com',
        expect.any(Object),
        mockLead
      );
    });
  });

  describe('generateCalculationNotes', () => {
    it('should generate comprehensive calculation notes', () => {
      const pricing = {
        seasonalMultiplier: 0.2,
        earlyBirdDiscount: 0.1,
        lastMinuteSurcharge: 0.25,
        groupDiscount: 0.08,
        weekendSurcharge: 0.08,
        daysUntilEvent: 14,
      };

      const addons = [
        { title: 'VIP Lounge' },
        { title: 'Helicopter Transfer' },
      ];

      const itineraries = [
        { title: 'Day 1: Arrival' },
        { title: 'Day 2: Event Day' },
      ];

      const notes = quoteController.generateCalculationNotes(pricing, addons, itineraries);

      expect(notes).toContain('Seasonal adjustment: +20%');
      expect(notes).toContain('Early bird discount: -10%');
      expect(notes).toContain('Last minute surcharge: +25%');
      expect(notes).toContain('Group discount: -8%');
      expect(notes).toContain('Weekend surcharge: +8%');
      expect(notes).toContain('VIP Lounge');
      expect(notes).toContain('Helicopter Transfer');
      expect(notes).toContain('Day 1: Arrival');
      expect(notes).toContain('Day 2: Event Day');
    });

    it('should handle empty adjustments', () => {
      const pricing = {
        seasonalMultiplier: 0,
        earlyBirdDiscount: 0,
        lastMinuteSurcharge: 0,
        groupDiscount: 0,
        weekendSurcharge: 0,
        daysUntilEvent: 30,
      };

      const notes = quoteController.generateCalculationNotes(pricing, [], []);

      expect(notes).not.toContain('Seasonal adjustment');
      expect(notes).not.toContain('Early bird discount');
      expect(notes).not.toContain('Last minute surcharge');
      expect(notes).not.toContain('Group discount');
      expect(notes).not.toContain('Weekend surcharge');
    });
  });

  describe('getQuotes', () => {
    it('should return quotes with filtering', async () => {
      const req = global.mockRequest({
        query: {
          leadId: 'lead-123',
          minPrice: '100',
          maxPrice: '1000',
          status: 'SENT',
          page: '1',
          limit: '10',
        },
      });
      const res = global.mockResponse();

      const mockQuotes = [
        {
          id: 'quote-1',
          leadId: 'lead-123',
          finalPrice: 500,
          status: 'SENT',
          lead: { id: 'lead-123', name: 'John' },
          event: { id: 'event-1', title: 'Event 1' },
          package: { id: 'package-1', title: 'Package 1' },
        },
      ];

      prisma.quote.findMany.mockResolvedValue(mockQuotes);
      prisma.quote.count.mockResolvedValue(1);

      await quoteController.getQuotes(req, res);

      expect(prisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            leadId: 'lead-123',
            status: 'SENT',
            finalPrice: { gte: 100, lte: 1000 },
          },
          skip: 0,
          take: 10,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockQuotes,
          pagination: expect.any(Object),
        })
      );
    });

    it('should filter by expiry date', async () => {
      const req = global.mockRequest({
        query: {
          expiryBefore: '2024-12-31',
          expiryAfter: '2024-01-01',
        },
      });
      const res = global.mockResponse();

      prisma.quote.findMany.mockResolvedValue([]);
      prisma.quote.count.mockResolvedValue(0);

      await quoteController.getQuotes(req, res);

      const whereClause = prisma.quote.findMany.mock.calls[0][0].where;
      expect(whereClause.expiryDate).toEqual({
        lte: expect.any(Date),
        gte: expect.any(Date),
      });
    });
  });

  describe('updateQuote', () => {
    it('should update quote successfully', async () => {
      const req = global.mockRequest({
        params: { id: 'quote-123' },
        body: {
          notes: 'Updated notes',
          status: 'ACCEPTED',
          finalPrice: 1200,
        },
      });
      const res = global.mockResponse();

      prisma.quote.findUnique.mockResolvedValue({ id: 'quote-123' });
      prisma.quote.update.mockResolvedValue({
        id: 'quote-123',
        notes: 'Updated notes',
        status: 'ACCEPTED',
        finalPrice: 1200,
      });

      await quoteController.updateQuote(req, res);

      expect(prisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quote-123' },
          data: {
            notes: 'Updated notes',
            status: 'ACCEPTED',
            finalPrice: 1200,
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Quote updated successfully',
        })
      );
    });

    it('should handle price updates correctly', async () => {
      const req = global.mockRequest({
        params: { id: 'quote-123' },
        body: {
          finalPrice: '1500',
          addonsTotal: '300',
          itinerariesTotal: '200',
          subtotal: '1000',
        },
      });
      const res = global.mockResponse();

      prisma.quote.findUnique.mockResolvedValue({ id: 'quote-123' });
      prisma.quote.update.mockResolvedValue({});

      await quoteController.updateQuote(req, res);

      const updateData = prisma.quote.update.mock.calls[0][0].data;
      expect(updateData.finalPrice).toBe(1500);
      expect(updateData.addonsTotal).toBe(300);
      expect(updateData.itinerariesTotal).toBe(200);
      expect(updateData.subtotal).toBe(1000);
    });

    it('should return 404 when quote not found', async () => {
      const req = global.mockRequest({
        params: { id: 'non-existent' },
        body: { notes: 'Update' },
      });
      const res = global.mockResponse();

      prisma.quote.findUnique.mockResolvedValue(null);

      await quoteController.updateQuote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Quote not found',
        })
      );
    });
  });

  describe('deleteQuote', () => {
    it('should delete quote successfully', async () => {
      const req = global.mockRequest({
        params: { id: 'quote-123' },
      });
      const res = global.mockResponse();

      prisma.quote.findUnique.mockResolvedValue({ id: 'quote-123' });
      prisma.quote.delete.mockResolvedValue({});

      await quoteController.deleteQuote(req, res);

      expect(prisma.quote.delete).toHaveBeenCalledWith({
        where: { id: 'quote-123' },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Quote deleted successfully',
        })
      );
    });

    it('should return 404 when quote not found', async () => {
      const req = global.mockRequest({
        params: { id: 'non-existent' },
      });
      const res = global.mockResponse();

      prisma.quote.findUnique.mockResolvedValue(null);

      await quoteController.deleteQuote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});