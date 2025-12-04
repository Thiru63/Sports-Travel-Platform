// src/controllers/adminController.js
import prisma from '../utils/database.js';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';

export const adminController = {
  // Admin login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }
      
      // Find admin in Lead table (role = 'admin')
      const admin = await prisma.lead.findFirst({
        where: {
          email,
          role: 'admin',
        },
      });
      
      if (!admin || !admin.password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        {
          sub: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      return res.json({
        success: true,
        data: {
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        },
        message: 'Login successful',
      });
    } catch (error) {
      logger.error('Admin login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  },
  
  // Create admin user (first time setup)
  async createAdmin(req, res) {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and name are required',
        });
      }
      
      // Check if admin already exists
      const existingAdmin = await prisma.lead.findFirst({
        where: {
          email,
          role: 'admin',
        },
      });
      
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          error: 'Admin already exists',
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin user
      const admin = await prisma.lead.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'admin',
          status: 'ACTIVE',
        },
      });
      
      logger.info(`Admin user created: ${admin.id}`);
      
      return res.status(201).json({
        success: true,
        data: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        message: 'Admin user created successfully',
      });
    } catch (error) {
      logger.error('Create admin error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create admin user',
      });
    }
  },
  
  // Generate API key for admin
  async generateApiKey(req, res) {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'API key name is required',
        });
      }
      
      // Generate random API key
      const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
      
      const apiKeyRecord = await prisma.adminApiKey.create({
        data: {
          name,
          key: apiKey,
          createdBy: req.user.email,
        },
      });
      
      // Return the key only once (for security)
      return res.status(201).json({
        success: true,
        data: {
          id: apiKeyRecord.id,
          name: apiKeyRecord.name,
          key: apiKey, // Only returned on creation
        },
        message: 'API key generated successfully. Save this key as it will not be shown again.',
        warning: 'Store this API key securely. It cannot be retrieved later.',
      });
    } catch (error) {
      logger.error('Generate API key error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate API key',
      });
    }
  },
  
};