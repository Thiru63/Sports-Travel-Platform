import { eventController } from '../../../src/controllers/eventController.js';

describe('EventController', () => {
  let prisma;

  beforeEach(() => {
    prisma = global.mockPrisma();
  });

  describe('getEvents', () => {
    it('should return active events with pagination', async () => {
      const req = global.mockRequest({
        query: {
          active: 'true',
          upcoming: 'true',
          page: '1',
          limit: '10',
        },
      });
      const res = global.mockResponse();

      const mockEvents = [
        {
          id: 'event-1',
          title: 'F1 Japan',
          isActive: true,
          startDate: new Date(Date.now() + 86400000), // Tomorrow
          _count: { packages: 3, itineraries: 5, addons: 2, quotes: 10 },
          packages: [{ id: 'pkg-1', title: 'VIP Package' }],
        },
      ];

      prisma.event.findMany.mockResolvedValue(mockEvents);
      prisma.event.count.mockResolvedValue(1);

      await eventController.getEvents(req, res);

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            startDate: { gte: expect.any(Date) },
          },
          skip: 0,
          take: 10,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockEvents,
          pagination: expect.any(Object),
        })
      );
    });

    it('should filter by category and featured packages', async () => {
      const req = global.mockRequest({
        query: {
          category: 'Formula 1',
          featured: 'true',
        },
      });
      const res = global.mockResponse();

      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await eventController.getEvents(req, res);

      const whereClause = prisma.event.findMany.mock.calls[0][0].where;
      expect(whereClause.category).toBe('Formula 1');
      expect(whereClause.packages.some.isFeatured).toBe(true);
    });

    it('should search events', async () => {
      const req = global.mockRequest({
        query: { search: 'Japan' },
      });
      const res = global.mockResponse();

      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await eventController.getEvents(req, res);

      const whereClause = prisma.event.findMany.mock.calls[0][0].where;
      expect(whereClause.OR).toHaveLength(4); // title, description, location, category
    });
  });

  describe('getEventPackages', () => {
    it('should return packages for an event', async () => {
      const req = global.mockRequest({
        params: { id: 'event-123' },
        query: { featured: 'true' },
      });
      const res = global.mockResponse();

      const mockPackages = [
        { id: 'pkg-1', title: 'VIP Package', basePrice: 1000 },
        { id: 'pkg-2', title: 'Standard Package', basePrice: 500 },
      ];

      prisma.event.findUnique.mockResolvedValue({ id: 'event-123' });
      prisma.package.findMany.mockResolvedValue(mockPackages);

      await eventController.getEventPackages(req, res);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-123' },
      });
      expect(prisma.package.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'event-123', isFeatured: true },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockPackages,
          count: 2,
        })
      );
    });

    it('should return 404 when event not found', async () => {
      const req = global.mockRequest({
        params: { id: 'non-existent' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue(null);

      await eventController.getEventPackages(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Event not found',
        })
      );
    });

    it('should filter packages by price range', async () => {
      const req = global.mockRequest({
        params: { id: 'event-123' },
        query: { minPrice: '500', maxPrice: '1500' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue({ id: 'event-123' });
      prisma.package.findMany.mockResolvedValue([]);

      await eventController.getEventPackages(req, res);

      const whereClause = prisma.package.findMany.mock.calls[0][0].where;
      expect(whereClause.basePrice).toEqual({
        gte: 500,
        lte: 1500,
      });
    });
  });

  describe('createEvent', () => {
    it('should create event successfully', async () => {
      const req = global.mockRequest({
        body: {
          title: 'New Event',
          description: 'Event description',
          location: 'Tokyo, Japan',
          startDate: '2024-10-01',
          endDate: '2024-10-03',
          category: 'Formula 1',
          seasonMonths: [10],
          isWeekend: true,
          tags: ['f1', 'japan'],
        },
        user: { email: 'admin@example.com' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue(null); // Slug not taken
      prisma.event.create.mockResolvedValue({
        id: 'event-new',
        title: 'New Event',
        slug: 'new-event',
        isActive: true,
      });

      await eventController.createEvent(req, res);

      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            title: 'New Event',
            description: 'Event description',
            location: 'Tokyo, Japan',
            startDate: expect.any(Date),
            endDate: expect.any(Date),
            category: 'Formula 1',
            seasonMonths: [10],
            isWeekend: true,
            slug: 'new-event',
            seoTitle: 'New Event',
            seoDescription: 'Event description',
            tags: ['f1', 'japan'],
            isActive: true,
          },
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event created successfully',
        })
      );
    });

    it('should reject duplicate slug', async () => {
      const req = global.mockRequest({
        body: {
          title: 'Existing Event',
          location: 'Location',
          startDate: '2024-10-01',
          endDate: '2024-10-03',
          slug: 'existing-slug',
        },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue({ id: 'existing' });

      await eventController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Event with this slug already exists',
        })
      );
    });
  });

  describe('updateEvent', () => {
    it('should update event successfully', async () => {
      const req = global.mockRequest({
        params: { id: 'event-123' },
        body: {
          title: 'Updated Event',
          isActive: false,
        },
      });
      const res = global.mockResponse();

      prisma.event.update.mockResolvedValue({
        id: 'event-123',
        title: 'Updated Event',
        isActive: false,
      });

      await eventController.updateEvent(req, res);

      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-123' },
          data: {
            title: 'Updated Event',
            isActive: false,
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event updated successfully',
        })
      );
    });

    it('should convert date strings to Date objects', async () => {
      const req = global.mockRequest({
        params: { id: 'event-123' },
        body: {
          startDate: '2024-10-01',
          endDate: '2024-10-03',
        },
      });
      const res = global.mockResponse();

      prisma.event.update.mockResolvedValue({});

      await eventController.updateEvent(req, res);

      const updateData = prisma.event.update.mock.calls[0][0].data;
      expect(updateData.startDate).toBeInstanceOf(Date);
      expect(updateData.endDate).toBeInstanceOf(Date);
    });
  });

  describe('deleteEvent', () => {
    it('should delete event successfully', async () => {
      const req = global.mockRequest({
        params: { id: 'event-123' },
        user: { email: 'admin@example.com' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue({
        id: 'event-123',
        _count: { packages: 0, quotes: 0 },
      });
      prisma.event.delete.mockResolvedValue({});

      await eventController.deleteEvent(req, res);

      expect(prisma.event.delete).toHaveBeenCalledWith({
        where: { id: 'event-123' },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event deleted successfully',
        })
      );
    });

    it('should not delete event with dependencies', async () => {
      const req = global.mockRequest({
        params: { id: 'event-123' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue({
        id: 'event-123',
        _count: { packages: 5, quotes: 10 },
      });

      await eventController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Cannot delete event'),
        })
      );
    });

    it('should return 404 when event not found', async () => {
      const req = global.mockRequest({
        params: { id: 'non-existent' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue(null);

      await eventController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});