// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import prisma from '../utils/database.js';
import config from '../config/index.js';

// Combined authentication for admin (JWT + API Key)
export const authenticateAdmin = async (req, res, next) => {
  try {
    // Check API Key first
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (apiKey && apiKey.startsWith('sk_')) {
      const validApiKey = await prisma.adminApiKey.findFirst({
        where: {
          key: apiKey,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
      });
      
      if (validApiKey) {
        // Update last used timestamp
        await prisma.adminApiKey.update({
          where: { id: validApiKey.id },
          data: { lastUsedAt: new Date() },
        });
        
        // Check IP whitelist if configured
        if (validApiKey.ipWhitelist && validApiKey.ipWhitelist.length > 0) {
          const clientIp = req.ip || req.connection.remoteAddress;
          if (!validApiKey.ipWhitelist.includes(clientIp)) {
            return res.status(403).json({
              success: false,
              error: 'IP address not authorized for this API key',
            });
          }
        }
        
        req.user = { 
          role: 'admin', 
          apiKeyId: validApiKey.id,
          permissions: validApiKey.permissions || {}
        };
        return next();
      }
    }
    
    // Fall back to JWT token
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide JWT token or API key.',
      });
    }
    
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Verify admin exists in Lead table
    const admin = await prisma.lead.findFirst({
      where: {
        id: decoded.sub,
        role: 'admin',
        email: decoded.email,
      },
    });
    
    if (!admin) {
      return res.status(403).json({
        success: false,
        error: 'Invalid admin credentials',
      });
    }
    
    req.user = { 
      ...decoded, 
      role: 'admin',
      id: admin.id,
      email: admin.email,
      name: admin.name 
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Optional authentication for leads
export const authenticateLead = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const lead = await prisma.lead.findUnique({
        where: { id: decoded.sub },
      });
      
      if (lead) {
        req.user = {
          ...decoded,
          role: 'lead',
          id: lead.id,
          email: lead.email,
          name: lead.name,
        };
      }
    }
    
    // If no token or invalid token, continue without authentication
    // Leads can still use some endpoints anonymously
    next();
  } catch (error) {
    // Invalid token, continue as anonymous
    next();
  }
};