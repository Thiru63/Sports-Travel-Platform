// src/middleware/validation.js
import { validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  
  next();
};

// Custom validators
export const validateObjectId = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error('Invalid UUID format');
  }
  return true;
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // Basic phone validation - accepts various formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)\.]/g, ''));
};

export const validateDate = (date) => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
};

export const validatePrice = (price) => {
  return !isNaN(price) && parseFloat(price) >= 0;
};

export const validateArray = (arr, validator) => {
  if (!Array.isArray(arr)) return false;
  return arr.every(item => validator(item));
};