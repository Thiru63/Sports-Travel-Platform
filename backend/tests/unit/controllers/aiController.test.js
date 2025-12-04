import { aiController } from '../../../src/controllers/aiController.js';
import aiService from '../../../src/services/aiService.js';

describe('AIController', () => {
  let prisma;

  beforeEach(() => {
    prisma = global.mockPrisma();
    jest.clearAllMocks();
  });

  describe('leadChat', () => {
    it('should process lead AI chat successfully', async () => {
      const req = global.mockRequest({
        body: { message: 'Hello, I need help with packages' },
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      });
      const res = global.mockResponse();

      const mockResult = {
        success: true,
        data: {
          message: 'I can help you with packages!',
          type: 'chat',
          intent: 'information',
          lead: {
            id: 'lead-123',
            name: 'John Doe',
            email: 'john@example.com',
            leadScore: 50,
          },
        },
      };

      aiService.handleLeadConversation.mockResolvedValue(mockResult);
      prisma.analyticEvent.create.mockResolvedValue({});

      await aiController.leadChat(req, res);

      expect(aiService.handleLeadConversation).toHaveBeenCalledWith(
        'Hello, I need help with packages',
        '192.168.1.1'
      );
      expect(prisma.analyticEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AI_CHAT',
          ip: '192.168.1.1',
        })
      );
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle missing message', async () => {
      const req = global.mockRequest({
        body: {},
        ip: '192.168.1.1',
      });
      const res = global.mockResponse();

      await aiController.leadChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message is required',
        })
      );
    });

    it('should handle AI service errors', async () => {
      const req = global.mockRequest({
        body: { message: 'Hello' },
        ip: '192.168.1.1',
      });
      const res = global.mockResponse();

      aiService.handleLeadConversation.mockRejectedValue(
        new Error('AI service error')
      );

      await aiController.leadChat(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to process AI chat',
        })
      );
    });
  });

  describe('adminChat', () => {
    it('should process admin AI chat successfully', async () => {
      const req = global.mockRequest({
        body: { message: 'Give me lead summary' },
        user: { id: 'admin-123', email: 'admin@example.com' },
      });
      const res = global.mockResponse();

      const mockResult = {
        success: true,
        data: {
          response: 'You have 50 leads this month.',
          type: 'admin_assistant',
          isContentGeneration: false,
        },
      };

      aiService.handleAdminQuery.mockResolvedValue(mockResult);

      await aiController.adminChat(req, res);

      expect(aiService.handleAdminQuery).toHaveBeenCalledWith(
        'Give me lead summary',
        'admin-123'
      );
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle content generation requests', async () => {
      const req = global.mockRequest({
        body: { message: 'Create SEO title for Olympics package' },
        user: { id: 'admin-123' },
      });
      const res = global.mockResponse();

      const mockResult = {
        success: true,
        data: {
          response: '5 Best SEO Titles for Olympics Package',
          type: 'content_generation',
          isContentGeneration: true,
        },
      };

      aiService.handleAdminQuery.mockResolvedValue(mockResult);

      await aiController.adminChat(req, res);

      expect(aiService.handleAdminQuery).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getLeadChatHistoryByIp', () => {
    it('should return chat history for IP', async () => {
      const req = global.mockRequest({
        ip: '192.168.1.1',
      });
      const res = global.mockResponse();

      const mockResult = {
        success: true,
        data: {
          lead: {
            id: 'lead-123',
            name: 'John Doe',
            ip: '192.168.1.1',
          },
          conversations: [
            { userMessage: 'Hello', aiMessage: 'Hi there!' },
          ],
        },
      };

      aiService.getLeadChatHistoryByIp.mockResolvedValue(mockResult);

      await aiController.getLeadChatHistoryByIp(req, res);

      expect(aiService.getLeadChatHistoryByIp).toHaveBeenCalledWith(
        '192.168.1.1'
      );
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle no lead found', async () => {
      const req = global.mockRequest({
        ip: 'unknown-ip',
      });
      const res = global.mockResponse();

      const mockResult = {
        success: false,
        error: 'No lead found with this IP address',
      };

      aiService.getLeadChatHistoryByIp.mockResolvedValue(mockResult);

      await aiController.getLeadChatHistoryByIp(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getLeadChatHistoryByLeadId', () => {
    it('should return chat history for lead ID', async () => {
      const req = global.mockRequest({
        params: { leadId: 'lead-123' },
      });
      const res = global.mockResponse();

      const mockResult = {
        success: true,
        data: {
          lead: {
            id: 'lead-123',
            name: 'John Doe',
          },
          conversations: [],
          groupedByDay: {},
          stats: {
            totalConversations: 0,
          },
        },
      };

      aiService.getLeadChatHistoryByLeadId.mockResolvedValue(mockResult);

      await aiController.getLeadChatHistoryByLeadId(req, res);

      expect(aiService.getLeadChatHistoryByLeadId).toHaveBeenCalledWith(
        'lead-123'
      );
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should require lead ID', async () => {
      const req = global.mockRequest({
        params: {},
      });
      const res = global.mockResponse();

      await aiController.getLeadChatHistoryByLeadId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getAllAiConversations', () => {
    it('should return all conversations with pagination', async () => {
      const req = global.mockRequest({
        query: {
          page: '1',
          limit: '20',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
      });
      const res = global.mockResponse();

      const mockConversations = [
        {
          id: 'conv-1',
          userMessage: 'Hello',
          aiMessage: 'Hi!',
          lead: { id: 'lead-1', name: 'John' },
        },
      ];

      prisma.aiConversation.findMany.mockResolvedValue(mockConversations);
      prisma.aiConversation.count.mockResolvedValue(1);
      prisma.aiConversation.groupBy
        .mockResolvedValueOnce([{ leadId: 'lead-1', _count: { id: 1 } }]) // Leads summary
        .mockResolvedValueOnce([{ meta: { intent: 'information' }, _count: { id: 1 } }]); // Intent distribution

      await aiController.getAllAiConversations(req, res);

      expect(prisma.aiConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
          skip: 0,
          take: 20,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            conversations: mockConversations,
            summary: expect.any(Object),
            pagination: expect.any(Object),
          },
        })
      );
    });

    it('should filter by lead ID and intent', async () => {
      const req = global.mockRequest({
        query: {
          leadId: 'lead-123',
          intent: 'booking',
        },
      });
      const res = global.mockResponse();

      prisma.aiConversation.findMany.mockResolvedValue([]);
      prisma.aiConversation.count.mockResolvedValue(0);
      prisma.aiConversation.groupBy.mockResolvedValue([]);

      await aiController.getAllAiConversations(req, res);

      const whereClause = prisma.aiConversation.findMany.mock.calls[0][0].where;
      expect(whereClause.leadId).toBe('lead-123');
      expect(whereClause.meta).toEqual(
        expect.objectContaining({
          path: ['intent'],
          equals: 'booking',
        })
      );
    });
  });
});