// src/controllers/packageController.js
import prisma from '../utils/database.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export const packageController = {
  // Get all packages with filtering
  async getPackages(req, res) {
    try {
      const {
        eventId,
        category,
        minPrice,
        maxPrice,
        isFeatured,
        upcoming = 'true',
        search,
        sortBy = 'basePrice',
        sortOrder = 'asc',
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
      
      if (category) {
        where.category = category;
      }
      
      if (minPrice) {
        where.basePrice = { gte: parseFloat(minPrice) };
      }
      
      if (maxPrice) {
        where.basePrice = { ...where.basePrice, lte: parseFloat(maxPrice) };
      }
      
      if (isFeatured === 'true') {
        where.isFeatured = true;
      } else if (isFeatured === 'false') {
        where.isFeatured = false;
      }
      
      if (upcoming === 'true') {
        where.event = {
          startDate: { gte: new Date() },
        };
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // Execute query
      const [packages, total] = await Promise.all([
        prisma.package.findMany({
          where,
          include: {
            event: {
              select: {
                id: true,
                title: true,
                location: true,
                startDate: true,
                endDate: true,
              },
            },
            _count: {
              select: {
                orders: true,
                quotes: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take,
        }),
        prisma.package.count({ where }),
      ]);
      
      // Format response
      const formattedPackages = packages.map(pkg => ({
        ...pkg,
        popularity: pkg._count.orders + pkg._count.quotes,
      }));
      
     
      
      return res.json({
        success: true,
        data: formattedPackages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get packages error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch packages',
      });
    }
  },
  
  
  // Create package (admin only)
  async createPackage(req, res) {
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
        basePrice,
        dynamicPrice,
        includes,
        excludes,
        location,
        eventDate,
        category,
        image,
        maxCapacity,
        minCapacity = 1,
        isFeatured = false,
        isEarlyBird = false,
        earlyBirdCutoff,
        currency = 'USD',
        slug,
      } = req.body;
      
      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
        });
      }
      
      // Generate slug if not provided
      const packageSlug = slug || title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-');
      
      // Check if slug is unique
      const existingPackage = await prisma.package.findUnique({
        where: { slug: packageSlug },
      });
      
      if (existingPackage) {
        return res.status(400).json({
          success: false,
          error: 'Package with this slug already exists',
        });
      }
      
      const package_ = await prisma.package.create({
        data: {
          eventId,
          title,
          description,
          basePrice: parseFloat(basePrice),
          dynamicPrice: dynamicPrice ? parseFloat(dynamicPrice) : null,
          includes: includes || [],
          excludes: excludes || [],
          location: location || event.location,
          eventDate: eventDate ? new Date(eventDate) : event.startDate,
          category,
          image,
          maxCapacity,
          minCapacity,
          isFeatured,
          isEarlyBird,
          earlyBirdCutoff: earlyBirdCutoff ? new Date(earlyBirdCutoff) : null,
          currency,
          slug: packageSlug,
        },
        include: {
          event: true,
        },
      });
      
      logger.info(`Package created: ${package_.id} by ${req.user?.email || 'admin'}`);
      
      return res.status(201).json({
        success: true,
        data: package_,
        message: 'Package created successfully',
      });
    } catch (error) {
      logger.error('Create package error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create package',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  
  // Update package (admin only)
  async updatePackage(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Convert numeric fields
      if (updateData.basePrice) {
        updateData.basePrice = parseFloat(updateData.basePrice);
      }
      if (updateData.dynamicPrice !== undefined) {
        updateData.dynamicPrice = updateData.dynamicPrice ? parseFloat(updateData.dynamicPrice) : null;
      }
      
      // Convert date fields
      if (updateData.eventDate) {
        updateData.eventDate = new Date(updateData.eventDate);
      }
      if (updateData.earlyBirdCutoff !== undefined) {
        updateData.earlyBirdCutoff = updateData.earlyBirdCutoff ? new Date(updateData.earlyBirdCutoff) : null;
      }
      
      const package_ = await prisma.package.update({
        where: { id },
        data: updateData,
        include: {
          event: true,
        },
      });
      
      return res.json({
        success: true,
        data: package_,
        message: 'Package updated successfully',
      });
    } catch (error) {
      logger.error('Update package error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Package not found',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update package',
      });
    }
  },
  
  // Delete package (admin only)
  async deletePackage(req, res) {
    try {
      const { id } = req.params;
      
      // Check if package has associated orders or quotes
      const packageWithRelations = await prisma.package.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              orders: true,
              quotes: true,
            },
          },
        },
      });
      
      if (!packageWithRelations) {
        return res.status(404).json({
          success: false,
          error: 'Package not found',
        });
      }
      
      // Check for dependencies
      if (packageWithRelations._count.orders > 0 || packageWithRelations._count.quotes > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete package with associated orders or quotes',
          dependencies: {
            orders: packageWithRelations._count.orders,
            quotes: packageWithRelations._count.quotes,
          },
        });
      }
      
      await prisma.package.delete({
        where: { id },
      });
      
      logger.info(`Package deleted: ${id} by ${req.user?.email || 'admin'}`);
      
      return res.json({
        success: true,
        message: 'Package deleted successfully',
      });
    } catch (error) {
      logger.error('Delete package error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete package',
      });
    }
  },
  
  
};