// src/controllers/eventController.js
import prisma from '../utils/database.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export const eventController = {
  // Get all events with filtering
  async getEvents(req, res) {
    try {
      const {
        active = 'true',
        category,
        upcoming = 'true',
        featured,
        search,
        sortBy = 'startDate',
        sortOrder = 'asc',
        page = 1,
        limit = 20,
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      
      // Build where clause
      const where = {};
      
      if (active === 'true') {
        where.isActive = true;
      }
      
      if (category) {
        where.category = category;
      }
      
      if (upcoming === 'true') {
        where.startDate = { gte: new Date() };
      } else if (upcoming === 'false') {
        where.startDate = { lt: new Date() };
      }
      
      if (featured === 'true') {
        where.packages = {
          some: {
            isFeatured: true,
          },
        };
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // Execute query
      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            _count: {
              select: {
                packages: true,
                itineraries: true,
                addons: true,
                quotes: true,
              },
            },
            packages: {
              where: { isFeatured: true },
              take: 3,
              orderBy: { basePrice: 'asc' },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take,
        }),
        prisma.event.count({ where }),
      ]);
      
     
      
      return res.json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get events error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch events',
      });
    }
  },
  
  
  // Get packages for a specific event
  async getEventPackages(req, res) {
    try {
      const { id } = req.params;
      const {
        featured,
        minPrice,
        maxPrice,
        category,
        sortBy = 'basePrice',
        sortOrder = 'asc',
      } = req.query;
      
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id },
      });
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
        });
      }
      
      // Build where clause
      const where = { eventId: id };
      
      if (featured === 'true') {
        where.isFeatured = true;
      } else if (featured === 'false') {
        where.isFeatured = false;
      }
      
      if (minPrice) {
        where.basePrice = { gte: parseFloat(minPrice) };
      }
      
      if (maxPrice) {
        where.basePrice = { ...where.basePrice, lte: parseFloat(maxPrice) };
      }
      
      if (category) {
        where.category = category;
      }
      
      const packages = await prisma.package.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
      });
      
      // Track analytics for package browsing
     
      
      return res.json({
        success: true,
        data: packages,
        count: packages.length,
      });
    } catch (error) {
      logger.error('Get event packages error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch packages',
      });
    }
  },
  
  // Create event (admin only)
  async createEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }
      
      const {
        title,
        description,
        location,
        startDate,
        endDate,
        image,
        category,
        seasonMonths,
        isWeekend,
        slug,
        seoTitle,
        seoDescription,
        tags,
      } = req.body;
      
      // Check if slug is unique
      if (slug) {
        const existingEvent = await prisma.event.findUnique({
          where: { slug },
        });
        
        if (existingEvent) {
          return res.status(400).json({
            success: false,
            error: 'Event with this slug already exists',
          });
        }
      }
      
      // Generate slug from title if not provided
      const eventSlug = slug || title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-');
      
      const event = await prisma.event.create({
        data: {
          title,
          description,
          location,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          image,
          category,
          seasonMonths: seasonMonths || [],
          isWeekend: isWeekend || false,
          slug: eventSlug,
          seoTitle: seoTitle || title,
          seoDescription: seoDescription || description?.substring(0, 160) || '',
          tags: tags || [],
          isActive: true,
        },
      });
      
      logger.info(`Event created: ${event.id} by ${req.user?.email || 'admin'}`);
      
      return res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully',
      });
    } catch (error) {
      logger.error('Create event error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create event',
      });
    }
  },
  
  // Update event (admin only)
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Convert date strings to Date objects if present
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }
      
      const event = await prisma.event.update({
        where: { id },
        data: updateData,
      });
      
      return res.json({
        success: true,
        data: event,
        message: 'Event updated successfully',
      });
    } catch (error) {
      logger.error('Update event error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update event',
      });
    }
  },
  
  // Delete event (admin only)
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      
      // Check if event has associated packages or quotes
      const eventWithRelations = await prisma.event.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              packages: true,
              quotes: true,
             
            },
          },
        },
      });
      
      if (!eventWithRelations) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
        });
      }
      
      // Check for dependencies
      if (eventWithRelations._count.packages > 0 || 
          eventWithRelations._count.quotes > 0 ) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete event with associated packages, quotes, or orders',
          dependencies: {
            packages: eventWithRelations._count.packages,
            quotes: eventWithRelations._count.quotes,
           
          },
        });
      }
      
      await prisma.event.delete({
        where: { id },
      });
      
      logger.info(`Event deleted: ${id} by ${req.user?.email || 'admin'}`);
      
      return res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      logger.error('Delete event error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete event',
      });
    }
  },
};