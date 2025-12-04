// src/middleware/errorHandler.js
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error message
  let message = err.message || 'Internal server error';
  
  // Hide internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.errors || err.message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
    });
  }

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    // Handle specific Prisma errors
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          field: err.meta?.target?.[0],
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          error: 'Record not found',
        });
      case 'P2003':
        return res.status(400).json({
          success: false,
          error: 'Foreign key constraint failed',
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Database error',
          code: err.code,
        });
    }
  }

  // Default error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details,
    }),
  });
};

// 404 handler middleware
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};