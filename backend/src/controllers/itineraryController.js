// src/controllers/itineraryController.js
import prisma from '../utils/database.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export const itineraryController = {
  // Get all itineraries with filtering
  async getItineraries(req, res) {
    try {
      const {
        eventId,
        search,
        page = 1,
        limit = 20,
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      
      // Build where clause
      const where = {};
      
      if (eventId) {
        where.eventId = eventId;
      }
      
      
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      const [itineraries, total] = await Promise.all([
        prisma.itinerary.findMany({
          where,
          include: {
            event: {
              select: {
                id: true,
                title: true,
                location: true,
              },
            },
          },
          orderBy: {
            dayNumber: 'asc',
          },
          skip,
          take,
        }),
        prisma.itinerary.count({ where }),
      ]);
      
      return res.json({
        success: true,
        data: itineraries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get itineraries error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch itineraries',
      });
    }
  },
  
  
  // Create itinerary (admin only)
  async createItinerary(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }
      
      const {
        eventId,
        title,
        description,
        dayNumber,
        activities,
        basePrice,
        duration,
        image,
       
      } = req.body;
      
      // Validate event exists
      
      
      
      
      const itinerary = await prisma.itinerary.create({
        data: {
          eventId,
          title,
          description,
          dayNumber,
          activities: activities || [],
          basePrice,
          duration,
          image,
        },
        include: {
          event: true,
          
        },
      });
      
      logger.info(`Itinerary created: ${itinerary.id} by ${req.user?.email || 'admin'}`);
      
      return res.status(201).json({
        success: true,
        data: itinerary,
        message: 'Itinerary created successfully',
      });
    } catch (error) {
      logger.error('Create itinerary error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create itinerary',
      });
    }
  },
  
  // Update itinerary (admin only)
  async updateItinerary(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      
      
      const updatedItinerary = await prisma.itinerary.update({
        where: { id },
        data: updateData,
        include: {
          event: true,
          
        },
      });
      
      return res.json({
        success: true,
        data: updatedItinerary,
        message: 'Itinerary updated successfully',
      });
    } catch (error) {
      logger.error('Update itinerary error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Itinerary not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update itinerary',
      });
    }
  },
  
  // Delete itinerary (admin only)
  async deleteItinerary(req, res) {
    try {
      const { id } = req.params;
      
      await prisma.itinerary.delete({
        where: { id },
      });
      
      logger.info(`Itinerary deleted: ${id} by ${req.user?.email || 'admin'}`);
      
      return res.json({
        success: true,
        message: 'Itinerary deleted successfully',
      });
    } catch (error) {
      logger.error('Delete itinerary error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Itinerary not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete itinerary',
      });
    }
  },
  
  
};