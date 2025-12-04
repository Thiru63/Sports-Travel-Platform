import { packageController } from '../../../src/controllers/packageController.js';

describe('PackageController', () => {
  let prisma;

  beforeEach(() => {
    prisma = global.mockPrisma();
  });

  describe('getPackages', () => {
    it('should return packages with filtering and pagination', async () => {
      const req = global.mockRequest({
        query: {
          eventId: 'event-123',
          minPrice: '500',
          maxPrice: '2000',
          isFeatured: 'true',
          page: '1',
          limit: '10',
        },
      });
      const res = global.mockResponse();

      const mockPackages = [
        {
          id: 'pkg-1',
          title: 'VIP Package',
          basePrice: 1000,
          isFeatured: true,
          event: { id: 'event-123', title: 'Event 1' },
          _count: { orders: 5, quotes: 10 },
        },
      ];

      prisma.package.findMany.mockResolvedValue(mockPackages);
      prisma.package.count.mockResolvedValue(1);

      await packageController.getPackages(req, res);

      expect(prisma.package.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventId: 'event-123',
            basePrice: { gte: 500, lte: 2000 },
            isFeatured: true,
          },
          skip: 0,
          take: 10,
          include: expect.any(Object),
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.any(Object),
        })
      );
    });

    it('should filter by category and upcoming events', async () => {
      const req = global.mockRequest({
        query: {
          category: 'Formula 1',
          upcoming: 'true',
        },
      });
      const res = global.mockResponse();

      prisma.package.findMany.mockResolvedValue([]);
      prisma.package.count.mockResolvedValue(0);

      await packageController.getPackages(req, res);

      const whereClause = prisma.package.findMany.mock.calls[0][0].where;
      expect(whereClause.category).toBe('Formula 1');
      expect(whereClause.event.startDate).toEqual({ gte: expect.any(Date) });
    });

    it('should search packages', async () => {
      const req = global.mockRequest({
        query: { search: 'VIP' },
      });
      const res = global.mockResponse();

      prisma.package.findMany.mockResolvedValue([]);
      prisma.package.count.mockResolvedValue(0);

      await packageController.getPackages(req, res);

      const whereClause = prisma.package.findMany.mock.calls[0][0].where;
      expect(whereClause.OR).toHaveLength(3); // title, description, location
    });
  });

  describe('createPackage', () => {
    it('should create package successfully', async () => {
      const req = global.mockRequest({
        body: {
          eventId: 'event-123',
          title: 'New Package',
          description: 'Package description',
          basePrice: '1500',
          includes: ['Accommodation', 'Tickets'],
          excludes: ['Flights'],
          location: 'Tokyo',
          maxCapacity: 50,
          minCapacity: 1,
          isFeatured: true,
          currency: 'USD',
        },
        user: { email: 'admin@example.com' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue({ id: 'event-123' });
      prisma.package.findUnique.mockResolvedValue(null); // Slug not taken
      prisma.package.create.mockResolvedValue({
        id: 'pkg-new',
        title: 'New Package',
        slug: 'new-package',
      });

      await packageController.createPackage(req, res);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-123' },
      });
      expect(prisma.package.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            eventId: 'event-123',
            title: 'New Package',
            description: 'Package description',
            basePrice: 1500,
            includes: ['Accommodation', 'Tickets'],
            excludes: ['Flights'],
            location: 'Tokyo',
            maxCapacity: 50,
            minCapacity: 1,
            isFeatured: true,
            currency: 'USD',
            slug: 'new-package',
          },
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 when event not found', async () => {
      const req = global.mockRequest({
        body: { eventId: 'non-existent', title: 'Package', basePrice: '1000' },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue(null);

      await packageController.createPackage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Event not found',
        })
      );
    });

    it('should reject duplicate slug', async () => {
      const req = global.mockRequest({
        body: {
          eventId: 'event-123',
          title: 'Existing Package',
          basePrice: '1000',
          slug: 'existing-slug',
        },
      });
      const res = global.mockResponse();

      prisma.event.findUnique.mockResolvedValue({ id: 'event-123' });
      prisma.package.findUnique.mockResolvedValue({ id: 'existing' });

      await packageController.createPackage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updatePackage', () => {
    it('should update package successfully', async () => {
      const req = global.mockRequest({
        params: { id: 'pkg-123' },
        body: {
          title: 'Updated Package',
          basePrice: '1200',
          isFeatured: false,
        },
      });
      const res = global.mockResponse();

      prisma.package.update.mockResolvedValue({
        id: 'pkg-123',
        title: 'Updated Package',
        basePrice: 1200,
        isFeatured: false,
      });

      await packageController.updatePackage(req, res);

      const updateData = prisma.package.update.mock.calls[0][0].data;
      expect(updateData.basePrice).toBe(1200);
      expect(updateData.isFeatured).toBe(false);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Package updated successfully',
        })
      );
    });

    it('should convert price strings to numbers', async () => {
      const req = global.mockRequest({
        params: { id: 'pkg-123' },
        body: {
          basePrice: '1500',
          dynamicPrice: '1200',
        },
      });
      const res = global.mockResponse();

      prisma.package.update.mockResolvedValue({});

      await packageController.updatePackage(req, res);

      const updateData = prisma.package.update.mock.calls[0][0].data;
      expect(updateData.basePrice).toBe(1500);
      expect(updateData.dynamicPrice).toBe(1200);
    });

    it('should return 404 when package not found', async () => {
      const req = global.mockRequest({
        params: { id: 'non-existent' },
        body: { title: 'Update' },
      });
      const res = global.mockResponse();

      prisma.package.update.mockRejectedValue({ code: 'P2025' });

      await packageController.updatePackage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deletePackage', () => {
    it('should delete package successfully', async () => {
      const req = global.mockRequest({
        params: { id: 'pkg-123' },
        user: { email: 'admin@example.com' },
      });
      const res = global.mockResponse();

      prisma.package.findUnique.mockResolvedValue({
        id: 'pkg-123',
        _count: { orders: 0, quotes: 0 },
      });
      prisma.package.delete.mockResolvedValue({});

      await packageController.deletePackage(req, res);

      expect(prisma.package.delete).toHaveBeenCalledWith({
        where: { id: 'pkg-123' },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Package deleted successfully',
        })
      );
    });

    it('should not delete package with orders or quotes', async () => {
      const req = global.mockRequest({
        params: { id: 'pkg-123' },
      });
      const res = global.mockResponse();

      prisma.package.findUnique.mockResolvedValue({
        id: 'pkg-123',
        _count: { orders: 5, quotes: 10 },
      });

      await packageController.deletePackage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Cannot delete package'),
        })
      );
    });
  });
});