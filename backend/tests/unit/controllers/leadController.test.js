import { leadController } from '../../../src/controllers/leadController.js';
import { leadService } from '../../../src/services/leadService.js';

describe('LeadController', () => {
  let prisma;

  beforeEach(() => {
    prisma = global.mockPrisma();
  });

  describe('createLead', () => {
    it('should create a new lead successfully', async () => {
      const req = global.mockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          source: 'website',
        },
        ip: '192.168.1.1',
      });
      const res = global.mockResponse();

      prisma.lead.findFirst.mockResolvedValue(null);
      prisma.lead.create.mockResolvedValue({
        id: 'lead-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        ip: '192.168.1.1',
        role: 'lead',
        status: 'NEW',
        leadScore: 0,
        createdAt: new Date(),
      });
      prisma.leadStatusHistory.create.mockResolvedValue({});
      prisma.lead.update.mockResolvedValue({});

      await leadController.createLead(req, res);

      expect(prisma.lead.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'john@example.com' },
            { ip: '192.168.1.1' },
          ],
        },
      });
      expect(prisma.lead.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Lead created successfully',
        })
      );
    });

    it('should update existing lead when found', async () => {
      const req = global.mockRequest({
        body: {
          name: 'John Updated',
          email: 'john@example.com',
        },
        ip: '192.168.1.1',
      });
      const res = global.mockResponse();

      prisma.lead.findFirst.mockResolvedValue({
        id: 'existing-123',
        name: 'John Old',
        email: 'john@example.com',
      });
      prisma.lead.update.mockResolvedValue({
        id: 'existing-123',
        name: 'John Updated',
        email: 'john@example.com',
      });
      prisma.leadStatusHistory.create.mockResolvedValue({});

      await leadController.createLead(req, res);

      expect(prisma.lead.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lead updated successfully',
        })
      );
    });

    it('should add event to interestedEvents when provided', async () => {
      const req = global.mockRequest({
        body: {
          email: 'test@example.com',
          eventId: 'event-123',
        },
        ip: '192.168.1.1',
      });
      const res = global.mockResponse();

      prisma.lead.findFirst.mockResolvedValue(null);
      prisma.lead.create.mockResolvedValue({
        id: 'lead-123',
        email: 'test@example.com',
        interestedEvents: ['event-123'],
      });
      prisma.leadStatusHistory.create.mockResolvedValue({});
      prisma.lead.update.mockResolvedValue({});

      await leadController.createLead(req, res);

      const createCall = prisma.lead.create.mock.calls[0][0];
      expect(createCall.data.interestedEvents).toEqual(['event-123']);
    });

    it('should handle errors gracefully', async () => {
      const req = global.mockRequest({
        body: { email: 'test@example.com' },
        ip: '192.168.1.1',
      });
      const res = global.mockResponse();

      prisma.lead.findFirst.mockRejectedValue(new Error('Database error'));

      await leadController.createLead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to create lead',
        })
      );
    });
  });

  describe('getLeads', () => {
    it('should return leads with pagination', async () => {
      const req = global.mockRequest({
        query: {
          page: '1',
          limit: '10',
          status: 'NEW',
        },
      });
      const res = global.mockResponse();

      const mockLeads = [
        {
          id: 'lead-1',
          name: 'Lead 1',
          email: 'lead1@example.com',
          status: 'NEW',
          leadScore: 50,
        },
      ];

      prisma.lead.findMany.mockResolvedValue(mockLeads);
      prisma.lead.count.mockResolvedValue(1);
      prisma.lead.findUnique.mockResolvedValue({});
      prisma.event.findMany.mockResolvedValue([]);

      await leadController.getLeads(req, res);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'lead', status: 'NEW' },
          skip: 0,
          take: 10,
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

    it('should filter by eventId', async () => {
      const req = global.mockRequest({
        query: { eventId: 'event-123' },
      });
      const res = global.mockResponse();

      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);
      prisma.event.findMany.mockResolvedValue([]);

      await leadController.getLeads(req, res);

      const whereClause = prisma.lead.findMany.mock.calls[0][0].where;
      expect(whereClause.interestedEvents).toEqual({ has: 'event-123' });
    });

    it('should filter by month', async () => {
      const req = global.mockRequest({
        query: { month: '12' },
      });
      const res = global.mockResponse();

      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);
      prisma.event.findMany.mockResolvedValue([]);

      await leadController.getLeads(req, res);

      const whereClause = prisma.lead.findMany.mock.calls[0][0].where;
      expect(whereClause.OR).toBeDefined();
    });

    it('should search by name, email, or phone', async () => {
      const req = global.mockRequest({
        query: { search: 'john' },
      });
      const res = global.mockResponse();

      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);
      prisma.event.findMany.mockResolvedValue([]);

      await leadController.getLeads(req, res);

      const whereClause = prisma.lead.findMany.mock.calls[0][0].where;
      expect(whereClause.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: expect.any(Object) }),
          expect.objectContaining({ email: expect.any(Object) }),
          expect.objectContaining({ phone: expect.any(Object) }),
        ])
      );
    });
  });

  describe('updateLeadStatus', () => {
    it('should update lead status successfully', async () => {
      const req = global.mockRequest({
        params: { id: 'lead-123' },
        body: {
          status: 'CONTACTED',
          notes: 'Called the lead',
          changedBy: 'admin@example.com',
        },
        user: { email: 'admin@example.com' },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-123',
        status: 'NEW',
        statusHistory: [],
      });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-123',
        status: 'CONTACTED',
      });
      prisma.leadStatusHistory.create.mockResolvedValue({});

      jest.spyOn(leadService, 'validateStatusTransition').mockReturnValue(true);

      await leadController.updateLeadStatus(req, res);

      expect(leadService.validateStatusTransition).toHaveBeenCalledWith('NEW', 'CONTACTED');
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-123' },
          data: { status: 'CONTACTED' },
        })
      );
      expect(prisma.leadStatusHistory.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Lead status updated successfully',
        })
      );
    });

    it('should reject invalid status transition', async () => {
      const req = global.mockRequest({
        params: { id: 'lead-123' },
        body: { status: 'CLOSED_WON' },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-123',
        status: 'NEW',
      });

      jest.spyOn(leadService, 'validateStatusTransition').mockReturnValue(false);

      await leadController.updateLeadStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid status transition'),
        })
      );
    });

    it('should return 404 when lead not found', async () => {
      const req = global.mockRequest({
        params: { id: 'non-existent' },
        body: { status: 'CONTACTED' },
      });
      const res = global.mockResponse();

      prisma.lead.findUnique.mockResolvedValue(null);

      await leadController.updateLeadStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Lead not found',
        })
      );
    });
  });

  describe('exportLeads', () => {
    it('should export leads as CSV', async () => {
      const req = global.mockRequest({
        query: { format: 'csv' },
      });
      const res = global.mockResponse();

      const mockLeads = [
        {
          id: 'lead-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          company: 'Test Corp',
          status: 'NEW',
          leadScore: 50,
          interestedEvents: ['event-1'],
          createdAt: new Date('2024-01-01'),
          quotes: [],
          orders: [],
        },
      ];

      prisma.lead.findMany.mockResolvedValue(mockLeads);

      await leadController.exportLeads(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(String));
    });

    it('should export leads as JSON', async () => {
      const req = global.mockRequest({
        query: { format: 'json' },
      });
      const res = global.mockResponse();

      const mockLeads = [{ id: 'lead-1', name: 'John' }];
      prisma.lead.findMany.mockResolvedValue(mockLeads);

      await leadController.exportLeads(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockLeads,
        })
      );
    });
  });
});