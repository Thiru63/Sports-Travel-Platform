// tests/helpers/mockData.js
export const mockLead = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  ip: '127.0.0.1',
  role: 'lead',
  status: 'NEW',
  leadScore: 50,
  interestedEvents: [],
  packageRecommendedByAi: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockEvent = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  title: 'FIFA World Cup 2026',
  description: 'Experience the greatest football event',
  location: 'USA',
  startDate: new Date('2026-06-15'),
  endDate: new Date('2026-07-15'),
  category: 'Football',
  seasonMonths: [6, 7],
  isWeekend: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockPackage = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  eventId: mockEvent.id,
  title: 'VIP World Cup Package',
  description: 'Premium experience',
  basePrice: 5000,
  dynamicPrice: 5500,
  includes: ['Tickets', 'Hotel', 'Transport'],
  excludes: ['Flights'],
  location: 'USA',
  category: 'Premium',
  isFeatured: true,
  isEarlyBird: true,
  earlyBirdCutoff: new Date('2026-01-01'),
  minCapacity: 1,
  maxCapacity: 100,
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockAdmin = {
  id: '423e4567-e89b-12d3-a456-426614174000',
  name: 'Admin User',
  email: 'admin@example.com',
  password: '$2a$10$hashedpassword', // bcrypt hash
  role: 'admin',
  status: 'ACTIVE',
};