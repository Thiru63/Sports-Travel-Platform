// src/controllers/leadController.js - UPDATED FOR FILTERING
import prisma from '../utils/database.js';
import { validationResult } from 'express-validator';
import { leadService } from '../services/leadService.js';
import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';

export const leadController = {
  // Create lead with IP tracking
  async createLead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }
      
      const {
        name,
        email,
        phone,
        company,
        position,
        source = 'website',
        
        message,
        
        eventId, // NEW: Track which event the lead is interested in
       
      } = req.body;
      
      const clientIp = req.ip || req.connection.remoteAddress;
      
      
      // Check for existing lead by email or IP
      const existingLead = await prisma.lead.findFirst({
        where: {
          OR: [
            { email: email || '' },
            { ip: clientIp || '' }
          ]
        },
      });
      
      let lead;
      
      if (existingLead) {
        // Update existing lead
        const updateData = {
          name: name || existingLead.name,
          email: email || existingLead.email,
          phone: phone || existingLead.phone,
          company: company || existingLead.company,
          position: position || existingLead.position,
          source: source || existingLead.source,
          
          message: message || existingLead.message,
          
          ip: clientIp || existingLead.ip,
         
        };
        
        // Add event to interestedEvents if provided
        if (eventId) {
          const currentEvents = existingLead.interestedEvents || [];
          if (!currentEvents.includes(eventId)) {
            updateData.interestedEvents = [...currentEvents, eventId];
          }
        }
        
        lead = await prisma.lead.update({
          where: { id: existingLead.id },
          data: updateData,
        });
        
        logger.info(`Updated existing lead: ${lead.id}`);
        // Send welcome email (only for new leads)
if (lead.email) {
  const emailSent = await emailService.sendWelcomeEmail(lead.email, lead);

  if (emailSent) {
    logger.info(`Welcome email successfully sent to ${lead.email}`);
  } else {
    logger.error(`Failed to send welcome email to ${lead.email}`);
  }
}
      } else {
        // Create new lead
        const createData = {
          name,
          email,
          phone,
          company,
          position,
          source,
         
          message,
          
          ip: clientIp,
          
          role: 'lead',
          status: 'NEW',
          leadScore: 0,
        };
        
        // Add event to interestedEvents if provided
        if (eventId) {
          createData.interestedEvents = [eventId];
        }
        
        lead = await prisma.lead.create({
          data: createData,
        });
        
        logger.info(`Created new lead: ${lead.id}`);
        // Send welcome email (only for new leads)
if (lead.email) {
  const emailSent = await emailService.sendWelcomeEmail(lead.email, lead);

  if (emailSent) {
    logger.info(`Welcome email successfully sent to ${lead.email}`);
  } else {
    logger.error(`Failed to send welcome email to ${lead.email}`);
  }
}
      }
      
      // Create initial status history
      await prisma.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: null,
          toStatus: 'NEW',
          changedBy: 'system',
          notes: existingLead ? 'Lead updated' : 'Lead created from website',
          
        },
      });
      
      // Calculate and update lead score
      const leadScore = leadService.calculateLeadScore(lead);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { leadScore },
      });
      
      
      
      return res.status(201).json({
        success: true,
        data: {
          ...lead,
          leadScore,
        },
        message: existingLead ? 'Lead updated successfully' : 'Lead created successfully',
      });
    } catch (error) {
      logger.error('Create lead error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create lead',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  
  // Get leads with advanced filtering (UPDATED FOR EVENT/MONTH FILTERING)
  async getLeads(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        eventId, // Filter by event (looks in interestedEvents array)
        month, // Filter by lead creation month OR event month
        search,
        source,
        campaign,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeQuotes = 'false',
        includeConversations = 'false',
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      
      // Build where clause
      const where = { role: 'lead' };
      
      if (status && status !== 'ALL') {
        where.status = status;
      }
      
      // FILTER BY EVENT: Check if lead has this event in interestedEvents array
      if (eventId) {
        where.interestedEvents = {
          has: eventId,
        };
      }
      
      // FILTER BY MONTH: Can filter by lead creation month OR event month
      if (month) {
        const year = new Date().getFullYear();
        const monthNum = parseInt(month);
        
        // Option 1: Filter by lead creation month (default)
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 1);
        
        where.OR = [
          // Filter by lead creation month
          {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
          // OR filter by having quotes for events in that month
          {
            quotes: {
              some: {
                event: {
                  OR: [
                    // Event start date is in this month
                    {
                      startDate: {
                        gte: startDate,
                        lt: endDate,
                      },
                    },
                    // OR event end date is in this month
                    {
                      endDate: {
                        gte: startDate,
                        lt: endDate,
                      },
                    },
                  ],
                },
              },
            },
          },
        ];
      }
      
      if (source) {
        where.source = source;
      }
      
      if (campaign) {
        where.campaign = campaign;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { position: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // Build include clause
      const include = {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      };
      
      if (includeQuotes === 'true') {
        include.quotes = {
          include: {
            event: true,
            package: true,
            addons: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        };
      }
      
      if (includeConversations === 'true') {
        include.aiConversations = {
          orderBy: { createdAt: 'desc' },
          take: 10,
        };
      }
      
      // Execute query
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include,
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take,
        }),
        prisma.lead.count({ where }),
      ]);
      
      // Calculate lead scores if not already calculated
      const leadsWithScores = await Promise.all(
        leads.map(async (lead) => {
          const leadScore = lead.leadScore || leadService.calculateLeadScore(lead);
          
          // Get events the lead is interested in
          let interestedEventsDetails = [];
          if (lead.interestedEvents && lead.interestedEvents.length > 0) {
            interestedEventsDetails = await prisma.event.findMany({
              where: {
                id: { in: lead.interestedEvents },
              },
              select: {
                id: true,
                title: true,
                location: true,
                startDate: true,
                endDate: true,
              },
            });
          }
          
          return {
            ...lead,
            leadScore,
            interestedEventsDetails,
          };
        })
      );
      
      // If filtering by event month, we need to post-filter
      let filteredLeads = leadsWithScores;
      if (month && eventId) {
        // Get all events happening in the specified month
        const year = new Date().getFullYear();
        const monthNum = parseInt(month);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 1);
        
        filteredLeads = filteredLeads.filter(lead => {
          // Check if lead has quotes for events in the specified month
          if (lead.quotes && lead.quotes.length > 0) {
            return lead.quotes.some(quote => {
              const eventStart = new Date(quote.event.startDate);
              const eventEnd = new Date(quote.event.endDate);
              return (
                (eventStart >= startDate && eventStart < endDate) ||
                (eventEnd >= startDate && eventEnd < endDate)
              );
            });
          }
          return false;
        });
      }
      
      return res.json({
        success: true,
        data: filteredLeads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredLeads.length,
          pages: Math.ceil(total / limit),
        },
        filters: {
          status,
          eventId,
          month,
          search,
          source,
          campaign,
        },
      });
    } catch (error) {
      logger.error('Get leads error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch leads',
      });
    }
  },
  
  // Update lead status with workflow validation
  async updateLeadStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes, changedBy = req.user?.email || 'system' } = req.body;
      
      // Validate status
      const currentLead = await prisma.lead.findUnique({
        where: { id },
        include: {
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      
      if (!currentLead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
      }
      
      // Validate status transition
      const isValidTransition = leadService.validateStatusTransition(
        currentLead.status,
        status
      );
      
      if (!isValidTransition) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${currentLead.status} to ${status}`,
          validTransitions: leadService.validTransitions[currentLead.status] || [],
        });
      }
      
      // Update lead
      const updatedLead = await prisma.lead.update({
        where: { id },
        data: {
          status,
          
        },
      });
      
      // Create status history entry
      await prisma.leadStatusHistory.create({
        data: {
          leadId: id,
          fromStatus: currentLead.status,
          toStatus: status,
          changedBy,
          notes,
          
        },
      });
      
      // Update lead score based on status change
      const newLeadScore = leadService.calculateLeadScore(updatedLead);
      await prisma.lead.update({
        where: { id },
        data: { leadScore: newLeadScore },
      });
      
     
      
      // Send notification if status is CLOSED_WON
      if (status === 'CLOSED_WON') {
        // TODO: Send congratulatory email to sales team
      }
      
      return res.json({
        success: true,
        data: {
          ...updatedLead,
          leadScore: newLeadScore,
        },
        message: 'Lead status updated successfully',
      });
    } catch (error) {
      logger.error('Update lead status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update lead status',
      });
    }
  },
  
  
  // Export leads to CSV
  async exportLeads(req, res) {
    try {
      const { status, startDate, endDate, format = 'csv' } = req.query;
      
      const where = { role: 'lead' };
      
      if (status && status !== 'ALL') {
        where.status = status;
      }
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      
      const leads = await prisma.lead.findMany({
        where,
        include: {
          quotes: {
            take: 5,
            select: {
              id: true,
              finalPrice: true,
              status: true,
            },
          },
         
        },
        orderBy: { createdAt: 'desc' },
      });
      
      if (format === 'json') {
        return res.json({
          success: true,
          data: leads,
          count: leads.length,
        });
      }
      
      // Generate CSV
      const headers = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Company',
        'Position',
        'Source',
        'Campaign',
        'Status',
        'Lead Score',
        'Interested Events Count',
        'Created At',
        'Last Contacted',
        'Total Quotes',
        'Total Orders',
        'Email Opt-In',
      ];
      
      const rows = leads.map(lead => [
        lead.id,
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        lead.company || '',
        lead.position || '',
        lead.source || '',
        lead.campaign || '',
        lead.status,
        lead.leadScore,
        lead.interestedEvents?.length || 0,
        lead.createdAt.toISOString(),
        lead.lastContactedAt?.toISOString() || '',
        lead.quotes?.length || 0,
        lead.orders?.length || 0,
        lead.emailOptIn ? 'Yes' : 'No',
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=leads-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      logger.error('Export leads error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export leads',
      });
    }
  },
  
  
  
  
};