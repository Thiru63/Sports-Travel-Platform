// src/controllers/quoteController.js
import prisma from '../utils/database.js';
import pricingService from '../services/pricingService.js';
import emailService from '../services/emailService.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export const quoteController = {
  // Generate quote with pricing logic
  async generateQuote(req, res) {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
          });
        }
        
        const {
          leadId,
          eventId,
          packageId,
          addonIds = [],
          itinerariesIds = [],
          travellers,
          travelDates,
          notes,
          currency = 'USD',
        } = req.body;
        
        // Fetch lead
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
        });
        
        if (!lead) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found',
          });
        }
        
        // Fetch event and package with relations
        const [event, package_, addons, itineraries] = await Promise.all([
          prisma.event.findUnique({
            where: { id: eventId },
          }),
          prisma.package.findUnique({
            where: { id: packageId },
            include: {
              event: true,
            },
          }),
          addonIds.length > 0 ? prisma.addOn.findMany({
            where: {
              id: { in: addonIds },
              eventId,
            },
          }) : Promise.resolve([]),
          itinerariesIds.length > 0 ? prisma.itinerary.findMany({
            where: {
              id: { in: itinerariesIds },
              eventId,
            },
          }) : Promise.resolve([]),
        ]);
        
        if (!event || !package_) {
          return res.status(404).json({
            success: false,
            error: 'Event or package not found',
          });
        }
        
        // Validate package belongs to event
        if (package_.eventId !== eventId) {
          return res.status(400).json({
            success: false,
            error: 'Package does not belong to the specified event',
          });
        }
        
        // Parse dates
        const parsedTravelDates = [
          new Date(travelDates[0]),
          new Date(travelDates[1]),
        ];
        
        // Calculate pricing
        const pricing = await pricingService.calculateQuote(
          package_.basePrice,
          event,
          package_,
          travellers,
          parsedTravelDates
        );
        
        // Calculate addons total
        const addonsTotal = addons.reduce((sum, addon) => {
          return sum + Number(addon.price);
        }, 0);
  
        // Calculate itineraries total
        const itinerariesTotal = itineraries.reduce((sum, itinerary) => {
          return sum + Number(itinerary.basePrice || 0);
        }, 0);
        
        // Calculate final price
        const subtotal = pricing.subtotal;
        const finalPrice = subtotal + addonsTotal + itinerariesTotal;
        
        // Set expiry date (30 days from now)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        // Create quote
        const quote = await prisma.quote.create({
          data: {
            leadId,
            eventId,
            packageId,
            addonIds,
            itinerariesIds,
            basePrice: package_.basePrice,
            seasonalMultiplier: pricing.seasonalMultiplier,
            seasonalAdjustment: pricing.seasonalAdjustment,
            earlyBirdDiscount: pricing.earlyBirdAdjustment,
            lastMinuteSurcharge: pricing.lastMinuteAdjustment,
            groupDiscount: pricing.groupAdjustment,
            weekendSurcharge: pricing.weekendAdjustment,
            addonsTotal,
            itinerariesTotal,
            subtotal,
            finalPrice,
            travellers,
            travelDates: parsedTravelDates,
            daysUntilEvent: pricing.daysUntilEvent,
            includesWeekend: pricing.includesWeekend,
            calculationNotes: this.generateCalculationNotes(pricing, addons, itineraries),
            notes,
            expiryDate,
            currency,
            status: 'SENT',
          },
          include: {
            event: true,
            package: true,
            lead: true,
          },
        });
        
        // Update lead status to QUOTE_SENT
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'QUOTE_SENT' },
        });
        
        // Create status history entry
        await prisma.leadStatusHistory.create({
          data: {
            leadId,
            fromStatus: lead.status,
            toStatus: 'QUOTE_SENT',
            changedBy: 'system',
            notes: `Quote generated for ${event.title} - ${package_.title}`,
          },
        });
        
        // Send email if lead has email
        if (lead?.email) {
          // Uncomment when email service is ready
          const emailSent = await emailService.sendQuoteEmail(
            lead.email,
            { ...quote, calculations: pricing, addons, itineraries },
            lead
          );
          
          if (emailSent) {
            await prisma.quote.update({
              where: { id: quote.id },
              data: {
                emailSent: true,
                emailSentAt: new Date(),
              },
            });
          }
        }
        
       
        
        return res.status(201).json({
          success: true,
          data: {
            quote,
            pricingBreakdown: {
              ...pricing,
              addonsTotal,
              itinerariesTotal,
              subtotal,
              finalPrice,
              currency,
            },
            calculationNotes: quote.calculationNotes,
          },
          message: 'Quote generated successfully',
        });
      } catch (error) {
        logger.error('Generate quote error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to generate quote',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    },
  
  // Generate human-readable calculation notes
  generateCalculationNotes(pricing, addons, itineraries) {
    const notes = [];
    
    if (pricing.seasonalMultiplier > 0) {
      notes.push(`Seasonal adjustment: +${(pricing.seasonalMultiplier * 100)}%`);
    }
    
    if (pricing.earlyBirdDiscount > 0) {
      notes.push(`Early bird discount: -${(pricing.earlyBirdDiscount * 100)}% (${pricing.daysUntilEvent} days before event)`);
    }
    
    if (pricing.lastMinuteSurcharge > 0) {
      notes.push(`Last minute surcharge: +${(pricing.lastMinuteSurcharge * 100)}% (${pricing.daysUntilEvent} days before event)`);
    }
    
    if (pricing.groupDiscount > 0) {
      notes.push(`Group discount: -${(pricing.groupDiscount * 100)}%`);
    }
    
    if (pricing.weekendSurcharge > 0) {
      notes.push(`Weekend surcharge: +${(pricing.weekendSurcharge * 100)}%`);
    }
    
    if (addons.length > 0) {
      notes.push(`Add-ons included: ${addons.map(a => a.title).join(', ')}`);
    }
    
    if (itineraries.length > 0) {
      notes.push(`Itineraries included: ${itineraries.map(i => i.title).join(', ')}`);
    }
    
    return notes.join(' | ');
  },

  // Get all quotes with filtering and pagination
  async getQuotes(req, res) {
    try {
      const {
        leadId,
        eventId,
        packageId,
        status,
        minPrice,
        maxPrice,
        expiryBefore,
        expiryAfter,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      
      // Build where clause
      const where = {};
      
      if (leadId) {
        where.leadId = leadId;
      }
      
      if (eventId) {
        where.eventId = eventId;
      }
      
      if (packageId) {
        where.packageId = packageId;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (minPrice) {
        where.finalPrice = { gte: parseFloat(minPrice) };
      }
      
      if (maxPrice) {
        where.finalPrice = { ...where.finalPrice, lte: parseFloat(maxPrice) };
      }
      
      if (expiryBefore) {
        where.expiryDate = { lte: new Date(expiryBefore) };
      }
      
      if (expiryAfter) {
        where.expiryDate = { ...where.expiryDate, gte: new Date(expiryAfter) };
      }
      
      if (search) {
        where.OR = [
          { notes: { contains: search, mode: 'insensitive' } },
          { calculationNotes: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // Execute query with relations
      const [quotes, total] = await Promise.all([
        prisma.quote.findMany({
          where,
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                status: true,
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                location: true,
              },
            },
            package: {
              select: {
                id: true,
                title: true,
                basePrice: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take,
        }),
        prisma.quote.count({ where }),
      ]);
      
      return res.json({
        success: true,
        data: quotes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get quotes error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch quotes',
      });
    }
  },
  
  
  // Update quote (admin only)
  async updateQuote(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Check if quote exists
      const existingQuote = await prisma.quote.findUnique({
        where: { id },
      });
      
      if (!existingQuote) {
        return res.status(404).json({
          success: false,
          error: 'Quote not found',
        });
      }
      
      // Handle price updates
      if (updateData.finalPrice) {
        updateData.finalPrice = parseFloat(updateData.finalPrice);
      }
      
      if (updateData.addonsTotal) {
        updateData.addonsTotal = parseFloat(updateData.addonsTotal);
      }
      
      if (updateData.itinerariesTotal) {
        updateData.itinerariesTotal = parseFloat(updateData.itinerariesTotal);
      }
      
      if (updateData.subtotal) {
        updateData.subtotal = parseFloat(updateData.subtotal);
      }
      
      // Handle date updates
      if (updateData.expiryDate) {
        updateData.expiryDate = new Date(updateData.expiryDate);
      }
      
      if (updateData.travelDates && Array.isArray(updateData.travelDates)) {
        updateData.travelDates = updateData.travelDates.map(date => new Date(date));
      }
      
      // Handle array updates
      if (updateData.addonIds && !Array.isArray(updateData.addonIds)) {
        return res.status(400).json({
          success: false,
          error: 'addonIds must be an array',
        });
      }
      
      if (updateData.itinerariesIds && !Array.isArray(updateData.itinerariesIds)) {
        return res.status(400).json({
          success: false,
          error: 'itinerariesIds must be an array',
        });
      }
      
      // Update quote
      const updatedQuote = await prisma.quote.update({
        where: { id },
        data: updateData,
        include: {
          lead: true,
          event: true,
          package: true,
        },
      });
      
      logger.info(`Quote updated: ${id} by ${req.user?.email || 'admin'}`);
      
      return res.json({
        success: true,
        data: updatedQuote,
        message: 'Quote updated successfully',
      });
    } catch (error) {
      logger.error('Update quote error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Quote not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update quote',
      });
    }
  },
  
  // Delete quote (admin only)
  async deleteQuote(req, res) {
    try {
      const { id } = req.params;
      
      // Check if quote exists
      const quote = await prisma.quote.findUnique({
        where: { id },
      });
      
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Quote not found',
        });
      }
      
      
      
      await prisma.quote.delete({
        where: { id },
      });
      
      logger.info(`Quote deleted: ${id} by ${req.user?.email || 'admin'}`);
      
      return res.json({
        success: true,
        message: 'Quote deleted successfully',
      });
    } catch (error) {
      logger.error('Delete quote error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Quote not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete quote',
      });
    }
  },
 
  
  
  
  
};