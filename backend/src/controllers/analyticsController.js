// src/controllers/analyticsController.js
import prisma from '../utils/database.js';
import logger from '../utils/logger.js';

export const analyticsController = {
  // Track analytics event
  async trackEvent(req, res) {
    try {
      const {
        type,
        page,
        section,
        element,
        metadata,
        leadId,
        packageId,
        itineraryId,
        addonId,
      } = req.body;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'type is required',
        });
      }
      
      const clientIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      
      const event = await prisma.analyticEvent.create({
        data: {
          type,
          page,
          section,
          element,
          ip: clientIp,
          userAgent,
          metadata,
          leadId,
          packageId,
          itineraryId,
          addonId,
        },
      });
      
      return res.status(201).json({
        success: true,
        data: event,
        message: 'Event tracked successfully',
      });
    } catch (error) {
      logger.error('Track analytics event error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to track analytics event',
      });
    }
  },
  
  // Get analytics summary
  async getAnalyticsSummary(req, res) {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Helper function to get daily stats
      const getDailyStats = async (startDate) => {
        const dailyStats = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          
          const [pageViews, leads, quotes] = await Promise.all([
            prisma.analyticEvent.count({
              where: {
                type: 'PAGE_VIEW',
                createdAt: {
                  gte: date,
                  lt: nextDate,
                },
              },
            }),
            prisma.analyticEvent.count({
              where: {
                OR: [
                  { type: 'LEAD_CREATED' },
                  { type: { contains: 'LEAD' } }
                ],
                createdAt: {
                  gte: date,
                  lt: nextDate,
                },
              },
            }),
            prisma.analyticEvent.count({
              where: {
                OR: [
                  { type: 'QUOTE_GENERATED' },
                  { type: { contains: 'QUOTE' } }
                ],
                createdAt: {
                  gte: date,
                  lt: nextDate,
                },
              },
            }),
          ]);
          
          const conversionRate = pageViews > 0 ? (leads / pageViews) * 100 : 0;
          
          dailyStats.push({
            date: date.toISOString().split('T')[0],
            pageViews,
            leads,
            quotes,
            conversionRate: Math.round(conversionRate * 100) / 100,
          });
        }
        
        return dailyStats;
      };
      
      // Helper function to get device stats
      const getDeviceStats = async (startDate) => {
        const events = await prisma.analyticEvent.findMany({
          where: {
            type: 'PAGE_VIEW',
            createdAt: { gte: startDate },
            userAgent: { not: null },
          },
          select: {
            userAgent: true,
          },
          take: 1000,
        });
        
        const deviceStats = {
          mobile: 0,
          desktop: 0,
          tablet: 0,
          other: 0,
        };
        
        events.forEach(event => {
          const ua = event.userAgent?.toLowerCase() || '';
          if (/mobile|android|iphone|ipod|ipad/.test(ua)) {
            if (/tablet|ipad/.test(ua)) {
              deviceStats.tablet++;
            } else {
              deviceStats.mobile++;
            }
          } else if (/windows|macintosh|linux/.test(ua)) {
            deviceStats.desktop++;
          } else {
            deviceStats.other++;
          }
        });
        
        return deviceStats;
      };
      
      // Helper function to get referral stats
      const getReferralStats = async (startDate) => {
        // Note: Your schema doesn't have a 'referrer' field
        // If you need referral tracking, you should add it to the schema
        // For now, return empty array
        return [];
      };
      
      const [
        totalEvents,
        uniqueVisitors,
        pageViews,
        leadConversions,
        quoteGenerations,
        popularPages,
        eventTypes,
        dailyStats,
        deviceStats,
      ] = await Promise.all([
        // Total events
        prisma.analyticEvent.count({
          where: { createdAt: { gte: startDate } },
        }),
        
        // Unique visitors (by IP)
        prisma.analyticEvent.groupBy({
          by: ['ip'],
          where: {
            createdAt: { gte: startDate },
            type: 'PAGE_VIEW',
          },
        }).then(results => results.length),
        
        // Page views
        prisma.analyticEvent.count({
          where: {
            type: 'PAGE_VIEW',
            createdAt: { gte: startDate },
          },
        }),
        
        // Lead conversions (LEAD_CREATED events)
        prisma.analyticEvent.count({
          where: {
            OR: [
              { type: 'LEAD_CREATED' },
              { type: { contains: 'LEAD' } }
            ],
            createdAt: { gte: startDate },
          },
        }),
        
        // Quote generations (QUOTE_GENERATED events)
        prisma.analyticEvent.count({
          where: {
            OR: [
              { type: 'QUOTE_GENERATED' },
              { type: { contains: 'QUOTE' } }
            ],
            createdAt: { gte: startDate },
          },
        }),
        
        // Popular pages
        prisma.analyticEvent.groupBy({
          by: ['page'],
          where: {
            type: 'PAGE_VIEW',
            createdAt: { gte: startDate },
            page: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
        
        // Event type distribution
        prisma.analyticEvent.groupBy({
          by: ['type'],
          where: { createdAt: { gte: startDate } },
          _count: { id: true },
        }),
        
        // Daily stats for chart
        getDailyStats(startDate),
        
        // Device statistics
        getDeviceStats(startDate),
      ]);
      
      // Calculate conversion rate (page views to leads)
      const conversionRate = pageViews > 0 ? (leadConversions / pageViews) * 100 : 0;
      
      const summary = {
        overview: {
          totalEvents,
          uniqueVisitors,
          pageViews,
          leadConversions,
          quoteGenerations,
          conversionRate: Math.round(conversionRate * 100) / 100,
        },
        popularPages: popularPages.map(item => ({
          page: item.page,
          views: item._count.id,
        })),
        eventTypes: eventTypes.map(item => ({
          type: item.type,
          count: item._count.id,
          percentage: totalEvents > 0 ? Math.round((item._count.id / totalEvents) * 10000) / 100 : 0,
        })),
        dailyStats,
        deviceStats,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days,
        },
      };
      
      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Get analytics summary error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics summary',
      });
    }
  },
  
  // Get funnel analytics
  async getFunnelAnalytics(req, res) {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Define funnel stages based on your schema event types
      const funnelStages = [
        { 
          name: 'Awareness', 
          types: ['PAGE_VIEW'] 
        },
        { 
          name: 'Consideration', 
          types: ['PACKAGE_VIEW', 'EVENT_VIEW', 'ITINERARY_VIEW', 'ADDON_VIEW'] 
        },
        { 
          name: 'Interest', 
          types: ['AI_CHAT', 'CTA_CLICK', 'FORM_SUBMIT'] 
        },
        { 
          name: 'Intent', 
          types: ['QUOTE_GENERATED', 'QUOTE_VIEWED'] 
        },
        { 
          name: 'Conversion', 
          types: ['LEAD_CREATED', 'ORDER_CREATED', 'BOOKING_COMPLETED'] 
        },
      ];
      
      // Get counts for each stage
      const stageCounts = await Promise.all(
        funnelStages.map(async (stage) => {
          const count = await prisma.analyticEvent.count({
            where: {
              type: { in: stage.types },
              createdAt: { gte: startDate },
            },
          });
          
          return {
            stage: stage.name,
            count,
            types: stage.types,
          };
        })
      );
      
      // Calculate conversion rates
      const funnelWithRates = stageCounts.map((stage, index) => {
        const previousStage = index > 0 ? stageCounts[index - 1] : null;
        const conversionRate = previousStage && previousStage.count > 0
          ? (stage.count / previousStage.count) * 100
          : 100;
        
        return {
          ...stage,
          conversionRate: Math.round(conversionRate * 100) / 100,
        };
      });
      
      // Get total visitors (unique IPs in awareness stage)
      const uniqueVisitors = await prisma.analyticEvent.groupBy({
        by: ['ip'],
        where: {
          type: { in: funnelStages[0].types },
          createdAt: { gte: startDate },
        },
      }).then(results => results.length);
      
      // Get total conversions (sum of all conversion events)
      const totalConversions = stageCounts[stageCounts.length - 1]?.count || 0;
      
      return res.json({
        success: true,
        data: {
          funnel: funnelWithRates,
          uniqueVisitors,
          totalConversions,
          overallConversionRate: uniqueVisitors > 0
            ? Math.round((totalConversions / uniqueVisitors) * 10000) / 100
            : 0,
          timeRange: {
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
            days,
          },
        },
      });
    } catch (error) {
      logger.error('Get funnel analytics error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch funnel analytics',
      });
    }
  },
  
  // Get real-time analytics
  async getRealtimeAnalytics(req, res) {
    try {
      const { minutes = 5 } = req.query;
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - parseInt(minutes));
      
      const [
        activeVisitors,
        recentEvents,
        popularPages,
        recentLeads,
      ] = await Promise.all([
        // Active visitors (unique IPs in last N minutes)
        prisma.analyticEvent.groupBy({
          by: ['ip'],
          where: {
            createdAt: { gte: startTime },
            type: 'PAGE_VIEW',
          },
        }).then(results => results.length),
        
        // Recent events
        prisma.analyticEvent.findMany({
          where: { createdAt: { gte: startTime } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            package: {
              select: {
                id: true,
                title: true,
              },
            },
            itinerary: {
              select: {
                id: true,
                title: true,
              },
            },
            addon: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),
        
        // Popular pages in last N minutes
        prisma.analyticEvent.groupBy({
          by: ['page'],
          where: {
            type: 'PAGE_VIEW',
            createdAt: { gte: startTime },
            page: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
        
        // Recent leads created
        prisma.lead.findMany({
          where: {
            role: 'lead',
            createdAt: { gte: startTime },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            source: true,
            createdAt: true,
          },
        }),
      ]);
      
      return res.json({
        success: true,
        data: {
          activeVisitors,
          recentEvents: recentEvents.map(event => ({
            id: event.id,
            type: event.type,
            page: event.page,
            section: event.section,
            element: event.element,
            time: event.createdAt,
            lead: event.lead,
            package: event.package,
            itinerary: event.itinerary,
            addon: event.addon,
          })),
          popularPages: popularPages.map(item => ({
            page: item.page,
            views: item._count.id,
          })),
          recentLeads,
          timeWindow: {
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            minutes,
          },
        },
      });
    } catch (error) {
      logger.error('Get realtime analytics error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch real-time analytics',
      });
    }
  },
  
  // Get analytics by lead
  async getAnalyticsByLead(req, res) {
    try {
      const { leadId } = req.params;
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      const [events, eventTypes, popularPages] = await Promise.all([
        // Get all events for this lead
        prisma.analyticEvent.findMany({
          where: {
            leadId,
            createdAt: { gte: startDate },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        
        // Get event type distribution for this lead
        prisma.analyticEvent.groupBy({
          by: ['type'],
          where: {
            leadId,
            createdAt: { gte: startDate },
          },
          _count: { id: true },
        }),
        
        // Get popular pages for this lead
        prisma.analyticEvent.groupBy({
          by: ['page'],
          where: {
            leadId,
            createdAt: { gte: startDate },
            page: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);
      
      // Get lead details
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          leadScore: true,
          createdAt: true,
        },
      });
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
      }
      
      // Calculate engagement metrics
      const totalEvents = events.length;
      const uniquePages = new Set(events.filter(e => e.page).map(e => e.page)).size;
      const lastActivity = events[0]?.createdAt || lead.createdAt;
      
      return res.json({
        success: true,
        data: {
          lead,
          metrics: {
            totalEvents,
            uniquePages,
            lastActivity,
            engagementScore: Math.min(totalEvents * 5, 100),
          },
          eventTypes: eventTypes.map(item => ({
            type: item.type,
            count: item._count.id,
          })),
          popularPages: popularPages.map(item => ({
            page: item.page,
            views: item._count.id,
          })),
          recentEvents: events.slice(0, 20),
          timeRange: {
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
            days,
          },
        },
      });
    } catch (error) {
      logger.error('Get analytics by lead error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch lead analytics',
      });
    }
  },
  
  
  // Get popular packages from analytics
  async getPopularPackages(req, res) {
    try {
      const { days = 30, limit = 10 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Get packages with most views
      const popularPackages = await prisma.analyticEvent.groupBy({
        by: ['packageId'],
        where: {
          type: 'PACKAGE_VIEW',
          createdAt: { gte: startDate },
          packageId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: parseInt(limit),
      });
      
      // Get package details
      const packagesWithDetails = await Promise.all(
        popularPackages.map(async (item) => {
          const pkg = await prisma.package.findUnique({
            where: { id: item.packageId },
            select: {
              id: true,
              title: true,
              basePrice: true,
              event: {
                select: {
                  title: true,
                  location: true,
                },
              },
            },
          });
          
          return {
            package: pkg,
            views: item._count.id,
          };
        })
      );
      
      return res.json({
        success: true,
        data: packagesWithDetails.filter(item => item.package),
        count: packagesWithDetails.length,
      });
    } catch (error) {
      logger.error('Get popular packages error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch popular packages',
      });
    }
  },
};