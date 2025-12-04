import { analyticsController } from '../../../src/controllers/analyticsController.js';

describe('AnalyticsController', () => {
  let prisma;

  beforeEach(() => {
    prisma = global.mockPrisma();
  });

  describe('trackEvent', () => {
    it('should track analytics event successfully', async () => {
      const req = global.mockRequest({
        body: {
          type: 'PAGE_VIEW',
          page: '/home',
          section: 'hero',
          element: 'cta-button',
          metadata: { referrer: 'google' },
          leadId: 'lead-123',
          packageId: 'pkg-123',
        },
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      });
      const res = global.mockResponse();

      prisma.analyticEvent.create.mockResolvedValue({
        id: 'event-123',
        type: 'PAGE_VIEW',
        page: '/home',
      });

      await analyticsController.trackEvent(req, res);

      expect(prisma.analyticEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            type: 'PAGE_VIEW',
            page: '/home',
            section: 'hero',
            element: 'cta-button',
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            metadata: { referrer: 'google' },
            leadId: 'lead-123',
            packageId: 'pkg-123',
          },
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event tracked successfully',
        })
      );
    });

    it('should require event type', async () => {
      const req = global.mockRequest({
        body: { page: '/home' },
      });
      const res = global.mockResponse();

      await analyticsController.trackEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'type is required',
        })
      );
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary for specified period', async () => {
      const req = global.mockRequest({
        query: { days: '30' },
      });
      const res = global.mockResponse();

      const mockDate = new Date();
      mockDate.setDate(mockDate.getDate() - 30);

      // Mock all the Prisma calls
      prisma.analyticEvent.count
        .mockResolvedValueOnce(1000) // totalEvents
        .mockResolvedValueOnce(500) // pageViews
        .mockResolvedValueOnce(50) // leadConversions
        .mockResolvedValueOnce(20); // quoteGenerations

      prisma.analyticEvent.groupBy
        .mockResolvedValueOnce([{ ip: 'ip1' }, { ip: 'ip2' }]) // uniqueVisitors
        .mockResolvedValueOnce([{ page: '/home', _count: { id: 100 } }]) // popularPages
        .mockResolvedValueOnce([{ type: 'PAGE_VIEW', _count: { id: 500 } }]); // eventTypes

      prisma.analyticEvent.findMany.mockResolvedValue([
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' },
        { userAgent: 'Mozilla/5.0 (iPhone)' },
      ]);

      await analyticsController.getAnalyticsSummary(req, res);

      expect(prisma.analyticEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: { gte: expect.any(Date) },
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            overview: expect.any(Object),
            popularPages: expect.any(Array),
            eventTypes: expect.any(Array),
            dailyStats: expect.any(Array),
            deviceStats: expect.any(Object),
          }),
        })
      );
    });

    it('should calculate conversion rate correctly', async () => {
      const req = global.mockRequest({
        query: { days: '7' },
      });
      const res = global.mockResponse();

      prisma.analyticEvent.count
        .mockResolvedValueOnce(100) // totalEvents
        .mockResolvedValueOnce(50) // uniqueVisitors (mock groupBy returns 2 items)
        .mockResolvedValueOnce(200) // pageViews
        .mockResolvedValueOnce(10) // leadConversions
        .mockResolvedValueOnce(5); // quoteGenerations

      prisma.analyticEvent.groupBy.mockResolvedValue([{ ip: 'ip1' }]);
      prisma.analyticEvent.findMany.mockResolvedValue([]);

      await analyticsController.getAnalyticsSummary(req, res);

      const response = res.json.mock.calls[0][0];
      // Conversion rate = (leadConversions / pageViews) * 100
      // (10 / 200) * 100 = 5%
      expect(response.data.overview.conversionRate).toBe(5);
    });
  });

  describe('getFunnelAnalytics', () => {
    it('should return funnel analytics', async () => {
      const req = global.mockRequest({
        query: { days: '30' },
      });
      const res = global.mockResponse();

      const mockDate = new Date();
      mockDate.setDate(mockDate.getDate() - 30);

      // Mock counts for each funnel stage
      prisma.analyticEvent.count
        .mockResolvedValueOnce(1000) // Awareness
        .mockResolvedValueOnce(500) // Consideration
        .mockResolvedValueOnce(200) // Interest
        .mockResolvedValueOnce(100) // Intent
        .mockResolvedValueOnce(50); // Conversion

      prisma.analyticEvent.groupBy.mockResolvedValue([{ ip: 'ip1' }, { ip: 'ip2' }]);

      await analyticsController.getFunnelAnalytics(req, res);

      expect(prisma.analyticEvent.count).toHaveBeenCalledTimes(5);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            funnel: expect.any(Array),
            uniqueVisitors: 2,
            totalConversions: 50,
            overallConversionRate: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('getRealtimeAnalytics', () => {
    it('should return real-time analytics', async () => {
      const req = global.mockRequest({
        query: { minutes: '5' },
      });
      const res = global.mockResponse();

      const mockStartTime = new Date();
      mockStartTime.setMinutes(mockStartTime.getMinutes() - 5);

      prisma.analyticEvent.groupBy.mockResolvedValue([{ ip: 'ip1' }]);
      prisma.analyticEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          type: 'PAGE_VIEW',
          page: '/home',
          lead: { id: 'lead-1', name: 'John' },
          createdAt: new Date(),
        },
      ]);
      prisma.lead.findMany.mockResolvedValue([
        { id: 'lead-1', name: 'John', email: 'john@example.com' },
      ]);

      await analyticsController.getRealtimeAnalytics(req, res);

      expect(prisma.analyticEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['ip'],
          where: {
            createdAt: { gte: expect.any(Date) },
            type: 'PAGE_VIEW',
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            activeVisitors: 1,
            recentEvents: expect.any(Array),
            recentLeads: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('getAnalyticsByLead', () => {
    it('should return analytics for specific lead', async () => {
      const req = global.mockRequest({
        params: { leadId: 'lead-123' },
        query: { days: '90' },
      });
      const res = global.mockResponse();

      const mockEvents = [
        { id: 'event-1', type: 'PAGE_VIEW', page: '/home' },
        { id: 'event-2', type: 'CTA_CLICK', page: '/packages' },
      ];

      prisma.analyticEvent.findMany.mockResolvedValue(mockEvents);
      prisma.analyticEvent.groupBy
        .mockResolvedValueOnce([{ type: 'PAGE_VIEW', _count: { id: 1 } }]) // eventTypes
        .mockResolvedValueOnce([{ page: '/home', _count: { id: 1 } }]); // popularPages

      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-123',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'NEW',
        leadScore: 50,
        createdAt: new Date(),
      });

      await analyticsController.getAnalyticsByLead(req, res);

      expect(prisma.analyticEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            leadId: 'lead-123',
            createdAt: { gte: expect.any(Date) },
          },
          take: 100,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            lead: expect.any(Object),
            metrics: expect.any(Object),
            eventTypes: expect.any(Array),
            popularPages: expect.any(Array),
          }),
        })
      );
    });

    it('should return 404 when lead not found', async () => {
      const req = global.mockRequest({
        params: { leadId: 'non-existent' },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue(null);

      await analyticsController.getAnalyticsByLead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Lead not found',
        })
      );
    });
  });

  describe('getPopularPackages', () => {
    it('should return popular packages from analytics', async () => {
      const req = global.mockRequest({
        query: { days: '30', limit: '5' },
      });
      const res = global.mockResponse();

      prisma.analyticEvent.groupBy.mockResolvedValue([
        { packageId: 'pkg-1', _count: { id: 100 } },
        { packageId: 'pkg-2', _count: { id: 50 } },
      ]);

      prisma.package.findUnique
        .mockResolvedValueOnce({
          id: 'pkg-1',
          title: 'VIP Package',
          basePrice: 1000,
          event: { title: 'F1 Japan', location: 'Tokyo' },
        })
        .mockResolvedValueOnce({
          id: 'pkg-2',
          title: 'Standard Package',
          basePrice: 500,
          event: { title: 'F1 Japan', location: 'Tokyo' },
        });

      await analyticsController.getPopularPackages(req, res);

      expect(prisma.analyticEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['packageId'],
          where: {
            type: 'PACKAGE_VIEW',
            createdAt: { gte: expect.any(Date) },
            packageId: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          count: 2,
        })
      );
    });
  });
});