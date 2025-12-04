// src/middleware/analytics.js
import prisma from '../utils/database.js';
import { v4 as uuidv4 } from 'uuid';

export const trackAnalytics = async (req, res, next) => {
  try {
    // Skip analytics for health checks and static files
    if (req.path === '/health' || req.path.startsWith('/static/')) {
      return next();
    }
    
    // Generate or get session ID
    let sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('sessionId', sessionId, {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
    
    // Store analytics data in request for later use
    req.analyticsData = {
      sessionId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      referrer: req.get('referer'),
      timestamp: new Date(),
    };
    
    // Track page views for public routes (async, don't await)
    if (req.method === 'GET' && !req.path.startsWith('/api/admin')) {
      setTimeout(async () => {
        try {
          await prisma.analyticEvent.create({
            data: {
              type: 'PAGE_VIEW',
              page: req.path,
              ip: req.analyticsData.ip,
              userAgent: req.analyticsData.userAgent,
              metadata: {
                method: req.method,
                query: req.query,
                params: req.params,
              },
            },
          });
        } catch (error) {
          console.error('Analytics tracking error:', error);
          // Don't throw, analytics shouldn't break the app
        }
      }, 0);
    }
    
    next();
  } catch (error) {
    // Don't block the request if analytics fails
    console.error('Analytics middleware error:', error);
    next();
  }
};

// Track specific events
export const trackEvent = async (req, eventData) => {
  try {
    await prisma.analyticEvent.create({
      data: {
        ...eventData,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Event tracking error:', error);
  }
};

// Track lead creation
export const trackLeadCreation = async (req, leadId) => {
  return trackEvent(req, {
    type: 'LEAD_CREATED',
    page: req.path,
    metadata: {
      leadId,
      method: req.method,
      path: req.path,
    },
    leadId,
  });
};

// Track quote generation
export const trackQuoteGeneration = async (req, quoteId, leadId, packageId) => {
  return trackEvent(req, {
    type: 'QUOTE_GENERATED',
    page: req.path,
    metadata: {
      quoteId,
      leadId,
      packageId,
      method: req.method,
    },
    leadId,
    packageId,
  });
};

// Track package view
export const trackPackageView = async (req, packageId, leadId = null) => {
  return trackEvent(req, {
    type: 'PACKAGE_VIEW',
    page: req.path,
    metadata: {
      packageId,
      leadId,
      method: req.method,
    },
    leadId,
    packageId,
  });
};

// Track event view
export const trackEventView = async (req, eventId, leadId = null) => {
  return trackEvent(req, {
    type: 'EVENT_VIEW',
    page: req.path,
    metadata: {
      eventId,
      leadId,
      method: req.method,
    },
    leadId,
  });
};

// Track CTA click
export const trackCtaClick = async (req, element, section, leadId = null) => {
  return trackEvent(req, {
    type: 'CTA_CLICK',
    page: req.path,
    element,
    section,
    metadata: {
      leadId,
      method: req.method,
    },
    leadId,
  });
};

// Track AI chat
export const trackAiChat = async (req, leadId, messageLength) => {
  return trackEvent(req, {
    type: 'AI_CHAT',
    page: req.path,
    metadata: {
      leadId,
      messageLength,
      method: req.method,
    },
    leadId,
  });
};

// Track form submission
export const trackFormSubmit = async (req, formType, leadId = null) => {
  return trackEvent(req, {
    type: 'FORM_SUBMIT',
    page: req.path,
    metadata: {
      formType,
      leadId,
      method: req.method,
    },
    leadId,
  });
};

// Common analytics event types
const EVENT_TYPES = {
  // Page Views
  PAGE_VIEW: 'PAGE_VIEW',
  EVENT_VIEW: 'EVENT_VIEW',
  PACKAGE_VIEW: 'PACKAGE_VIEW',
  ITINERARY_VIEW: 'ITINERARY_VIEW',
  ADDON_VIEW: 'ADDON_VIEW',
  
  // User Actions
  CTA_CLICK: 'CTA_CLICK',
  FORM_SUBMIT: 'FORM_SUBMIT',
  AI_CHAT: 'AI_CHAT',
  
  // Business Events
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  QUOTE_GENERATED: 'QUOTE_GENERATED',
  QUOTE_VIEWED: 'QUOTE_VIEWED',
  QUOTE_ACCEPTED: 'QUOTE_ACCEPTED',
  ORDER_CREATED: 'ORDER_CREATED',
  BOOKING_COMPLETED: 'BOOKING_COMPLETED',
  
  // System Events
  ERROR: 'ERROR',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
};