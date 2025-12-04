// src/controllers/addonController.js
import prisma from '../utils/database.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export const addonController = {
  // Get all addons with filtering
  async getAddons(req, res) {
    try {
      const {
        eventId,
        
        isOptional = 'true',
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
      
     
      
      if (isOptional === 'true') {
        where.isOptional = true;
      } else if (isOptional === 'false') {
        where.isOptional = false;
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      const [addons, total] = await Promise.all([
        prisma.addOn.findMany({
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
            price: 'asc',
          },
          skip,
          take,
        }),
        prisma.addOn.count({ where }),
      ]);
      
      return res.json({
        success: true,
        data: addons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get addons error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch addons',
      });
    }
  },
  
  // Create addon (admin only)
  async createAddon(req, res) {
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
        price,
        basePrice,
       
        isOptional = true,
        image,
        
      } = req.body;
      
     
      
      
      
      const addon = await prisma.addOn.create({
        data: {
          eventId,
          
          title,
          description,
          price: parseFloat(price),
          basePrice,
          
          isOptional,
          image,
         
        },
        include: {
          event: true,
          
        },
      });
      
      logger.info(`Addon created: ${addon.id} by ${req.user?.email || 'admin'}`);
      
      return res.status(201).json({
        success: true,
        data: addon,
        message: 'Addon created successfully',
      });
    } catch (error) {
      logger.error('Create addon error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create addon',
      });
    }
  },
  
  // Update addon (admin only)
  async updateAddon(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Convert price if provided
      if (updateData.price) {
        updateData.price = parseFloat(updateData.price);
      }
      
      
      
      const updatedAddon = await prisma.addOn.update({
        where: { id },
        data: updateData,
        include: {
          event: true,
         
        },
      });
      
      return res.json({
        success: true,
        data: updatedAddon,
        message: 'Addon updated successfully',
      });
    } catch (error) {
      logger.error('Update addon error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Addon not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update addon',
      });
    }
  },
  
  // Delete addon (admin only)
  async deleteAddon(req, res) {
    try {
      const { id } = req.params;
      
      // Check if addon is referenced in any quotes
      const quotesWithAddon = await prisma.quote.findMany({
        where: {
          addonIds: { has: id },
        },
        take: 1,
      });
      
      if (quotesWithAddon.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete addon that is referenced in quotes',
        });
      }
      
      await prisma.addOn.delete({
        where: { id },
      });
      
      logger.info(`Addon deleted: ${id} by ${req.user?.email || 'admin'}`);
      
      return res.json({
        success: true,
        message: 'Addon deleted successfully',
      });
    } catch (error) {
      logger.error('Delete addon error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Addon not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete addon',
      });
    }
  },
  

};