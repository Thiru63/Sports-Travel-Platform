import aiService from '../services/aiService.js';
import prisma from '../utils/database.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export const aiController = {
  // ===========================================================
  // LEAD AI CHAT (IP-based)
  // ===========================================================
  
  async leadChat(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }
      
      const { message } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
        });
      }
      
      logger.info(`Lead AI chat request from IP: ${clientIp}, Message: ${message.substring(0, 50)}...`);
      
      const result = await aiService.handleLeadConversation(message, clientIp);
      
      // Track analytics event
      try {
        await prisma.analyticEvent.create({
          data: {
            type: 'AI_CHAT',
            page: '/ai/chat',
            ip: clientIp,
            userAgent: req.get('user-agent'),
            metadata: {
              messageLength: message.length,
              intent: result.data.intent,
              type: result.data.type,
              leadId: result.data.lead.id,
            },
            leadId: result.data.lead.id,
          },
        });
      } catch (analyticsError) {
        logger.warn('Failed to track analytics:', analyticsError);
        // Don't fail the request if analytics tracking fails
      }
      
      return res.json(result);
    } catch (error) {
      logger.error('Lead AI chat controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process AI chat',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  
  // ===========================================================
  // ADMIN AI CHAT
  // ===========================================================
  
  async adminChat(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }
      
      const { message } = req.body;
      const adminId = req.user.id;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
        });
      }
      
      logger.info(`Admin AI chat request from admin: ${adminId}, Message: ${message.substring(0, 50)}...`);
      
      const result = await aiService.handleAdminQuery(message, adminId);
      
      return res.json(result);
    } catch (error) {
      logger.error('Admin AI chat controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process admin AI chat',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  
  // ===========================================================
  // GET LEAD CHAT HISTORY BY IP ADDRESS
  // ===========================================================
  
  async getLeadChatHistoryByIp(req, res) {
    try {
      const  ip = req.ip || req.connection.remoteAddress;
      
      if (!ip) {
        return res.status(400).json({
          success: false,
          error: 'IP address is required',
        });
      }
      
      logger.info(`Fetching chat history for IP: ${ip}`);
      
      const result = await aiService.getLeadChatHistoryByIp(ip);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.json(result);
    } catch (error) {
      logger.error('Get lead chat history by IP error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch chat history',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  
  // ===========================================================
  // GET LEAD CHAT HISTORY BY LEAD ID (Admin only)
  // ===========================================================
  
  async getLeadChatHistoryByLeadId(req, res) {
    try {
      const { leadId } = req.params;
      
      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required',
        });
      }
      
      logger.info(`Fetching chat history for lead: ${leadId}`);
      
      const result = await aiService.getLeadChatHistoryByLeadId(leadId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.json(result);
    } catch (error) {
      logger.error('Get lead chat history by lead ID error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch chat history',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  
  // ===========================================================
  // GET ALL AI CONVERSATIONS (Admin only - for dashboard)
  // ===========================================================
  
  async getAllAiConversations(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        leadId,
        startDate,
        endDate,
        intent,
        type,
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      
      // Build where clause
      const where = {};
      
      if (leadId) {
        where.leadId = leadId;
      }
      
      if (intent) {
        where.meta = {
          path: ['intent'],
          equals: intent,
        };
      }
      
      if (type) {
        where.meta = {
          ...where.meta,
          path: ['type'],
          equals: type,
        };
      }
      
      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      
      const [conversations, total] = await Promise.all([
        prisma.aiConversation.findMany({
          where,
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.aiConversation.count({ where }),
      ]);
      
      // Group by lead for summary
      const leadsSummary = await prisma.aiConversation.groupBy({
        by: ['leadId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });
      
      // Get lead details for summary
      const leadsWithDetails = await Promise.all(
        leadsSummary.map(async (item) => {
          const lead = await prisma.lead.findUnique({
            where: { id: item.leadId },
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              leadScore: true,
            },
          });
          return {
            lead,
            conversationCount: item._count.id,
          };
        })
      );
      
      // Get intent distribution
      const intentDistribution = await prisma.aiConversation.groupBy({
        by: ['meta'],
        where: {
          meta: {
            path: ['intent'],
            not: null,
          },
        },
        _count: { id: true },
      });
      
      const formattedIntentDistribution = intentDistribution.reduce((acc, item) => {
        const intent = item.meta?.intent || 'unknown';
        acc[intent] = (acc[intent] || 0) + item._count.id;
        return acc;
      }, {});
      
      return res.json({
        success: true,
        data: {
          conversations,
          summary: {
            totalConversations: total,
            totalLeads: await prisma.aiConversation.groupBy({
              by: ['leadId'],
              where,
            }).then(results => results.length),
            leadsWithMostConversations: leadsWithDetails,
            intentDistribution: formattedIntentDistribution,
          },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Get all AI conversations error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch AI conversations',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  
  
  // ===========================================================
  // HELPER METHODS
  // ===========================================================
  
  extractInterestsFromWords(topWords) {
    const sportsKeywords = ['football', 'soccer', 'basketball', 'tennis', 'formula', 'f1', 'olympics', 'worldcup', 'cricket', 'golf', 'rugby'];
    const destinationKeywords = ['japan', 'brazil', 'usa', 'uk', 'london', 'newyork', 'paris', 'monaco', 'australia', 'canada'];
    
    const interests = {
      sports: [],
      destinations: [],
    };
    
    topWords.forEach(({ word }) => {
      if (sportsKeywords.some(keyword => word.includes(keyword))) {
        interests.sports.push(word);
      }
      if (destinationKeywords.some(keyword => word.includes(keyword))) {
        interests.destinations.push(word);
      }
    });
    
    return interests;
  },
  
  generateRecommendations(lead, intentCounts, sessionCount) {
    const recommendations = [];
    
    // Based on engagement level
    if (sessionCount < 2) {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        title: 'Increase Engagement',
        description: 'Lead has low engagement. Consider sending a follow-up email or offering a special promotion.',
        action: 'Send personalized follow-up email',
      });
    }
    
    // Based on primary intent
    const primaryIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    
    if (primaryIntent === 'information' && lead.quotes.length === 0) {
      recommendations.push({
        type: 'conversion',
        priority: 'high',
        title: 'Convert Information Seeker',
        description: 'Lead is interested in information but hasn\'t requested a quote. Proactively offer a quote.',
        action: 'Generate and send a sample quote',
      });
    }
    
    if (primaryIntent === 'quote' && lead.quotes.length > 0 && lead.orders.length === 0) {
      recommendations.push({
        type: 'conversion',
        priority: 'medium',
        title: 'Follow Up on Quotes',
        description: 'Lead has quotes but no orders. Follow up on the most recent quote.',
        action: 'Send quote reminder email',
      });
    }
    
    // Based on lead score
    if (lead.leadScore < 30) {
      recommendations.push({
        type: 'scoring',
        priority: 'medium',
        title: 'Improve Lead Score',
        description: 'Lead has low score. Try to collect more contact information or offer incentives.',
        action: 'Request missing contact information via email',
      });
    }
    
    // Based on interested events
    if (lead.interestedEvents?.length > 0 && lead.quotes.length === 0) {
      recommendations.push({
        type: 'personalization',
        priority: 'low',
        title: 'Personalize Offers',
        description: 'Lead has shown interest in specific events. Create personalized package offers.',
        action: 'Create custom package recommendations',
      });
    }
    
    return recommendations;
  },
};