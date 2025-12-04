// src/utils/helpers.js
import crypto from 'crypto';

// Generate API key
export const generateApiKey = () => {
  return `sk_live_${crypto.randomBytes(32).toString('hex')}`;
};

// Generate random string
export const generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex');
};

// Format price
export const formatPrice = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Calculate days between dates
export const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)\.]/g, ''));
};

// Sanitize input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
};

// Generate slug from title
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
};

// Paginate array
export const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    page: parseInt(page),
    limit: parseInt(limit),
    total: array.length,
    pages: Math.ceil(array.length / limit),
  };
};

// Calculate lead score
export const calculateLeadScore = (lead) => {
  let score = 0;
  
  if (lead.email) score += 20;
  if (lead.phone) score += 15;
  if (lead.company) score += 10;
  if (lead.position) score += 5;
  
  // Engagement factors
  if (lead.quotes && lead.quotes.length > 0) {
    score += Math.min(lead.quotes.length * 10, 30);
  }
  
  // Recent activity
  const daysSinceCreation = Math.floor(
    (new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceCreation <= 7) {
    score += 20;
  }
  
  return Math.min(score, 100);
};