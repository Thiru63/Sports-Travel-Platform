import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock external services BEFORE importing modules that use them
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn().mockReturnValue({ sub: 'user_id', email: 'test@test.com' }),
}));

jest.mock('groq-sdk', () => ({
  Groq: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: { content: 'Mock AI response' },
          }],
        }),
      },
    },
  })),
}));

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    event: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    package: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    quote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    itinerary: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    addOn: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    aiConversation: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    leadStatusHistory: {
      create: jest.fn(),
    },
    analyticEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    adminApiKey: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (fn) => fn()),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock service modules
jest.mock('../../src/services/pricingService.js', () => {
  const mockCalculateQuote = jest.fn();
  return {
    __esModule: true,
    default: {
      calculateQuote: mockCalculateQuote,
      getSeasonalMultiplier: jest.fn(),
      calculateEarlyBirdDiscount: jest.fn(),
      calculateLastMinuteSurcharge: jest.fn(),
      calculateGroupDiscount: jest.fn(),
      calculateWeekendSurcharge: jest.fn(),
    },
    PricingService: jest.fn().mockImplementation(() => ({
      calculateQuote: mockCalculateQuote,
      getSeasonalMultiplier: jest.fn(),
      calculateEarlyBirdDiscount: jest.fn(),
      calculateLastMinuteSurcharge: jest.fn(),
      calculateGroupDiscount: jest.fn(),
      calculateWeekendSurcharge: jest.fn(),
    })),
  };
});

jest.mock('../../src/services/aiService.js', () => ({
  __esModule: true,
  default: {
    handleLeadConversation: jest.fn(),
    handleAdminQuery: jest.fn(),
    getLeadChatHistoryByIp: jest.fn(),
    getLeadChatHistoryByLeadId: jest.fn(),
  },
}));

jest.mock('../../src/services/leadService.js', () => ({
  __esModule: true,
  leadService: {
    validateStatusTransition: jest.fn(),
    calculateLeadScore: jest.fn(),
    statusWorkflow: ['NEW', 'CONTACTED', 'QUOTE_SENT', 'INTERESTED', 'CLOSED_WON', 'CLOSED_LOST'],
    validTransitions: {
      NEW: ['CONTACTED', 'CLOSED_LOST'],
      CONTACTED: ['QUOTE_SENT', 'CLOSED_LOST'],
      QUOTE_SENT: ['INTERESTED', 'CONTACTED', 'CLOSED_LOST'],
      INTERESTED: ['QUOTE_SENT', 'CLOSED_WON', 'CLOSED_LOST'],
      CLOSED_WON: [],
      CLOSED_LOST: ['CONTACTED'],
    },
  },
  LeadService: jest.fn().mockImplementation(() => ({
    validateStatusTransition: jest.fn(),
    calculateLeadScore: jest.fn(),
    statusWorkflow: ['NEW', 'CONTACTED', 'QUOTE_SENT', 'INTERESTED', 'CLOSED_WON', 'CLOSED_LOST'],
    validTransitions: {
      NEW: ['CONTACTED', 'CLOSED_LOST'],
      CONTACTED: ['QUOTE_SENT', 'CLOSED_LOST'],
      QUOTE_SENT: ['INTERESTED', 'CONTACTED', 'CLOSED_LOST'],
      INTERESTED: ['QUOTE_SENT', 'CLOSED_WON', 'CLOSED_LOST'],
      CLOSED_WON: [],
      CLOSED_LOST: ['CONTACTED'],
    },
  })),
}));

jest.mock('../../src/services/emailService.js', () => ({
  __esModule: true,
  default: {
    sendQuoteEmail: jest.fn(),
    generateQuoteEmailTemplate: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Global test utilities
global.mockPrisma = () => require('@prisma/client').PrismaClient();

global.mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ip: '127.0.0.1',
  get: jest.fn((key) => {
    if (key === 'user-agent') return 'Mozilla/5.0 (Test)';
    return null;
  }),
  ...overrides,
});

global.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

global.mockNext = jest.fn();