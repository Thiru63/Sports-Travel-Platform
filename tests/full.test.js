require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../server');
const prisma = require('../utils/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// -------------------------------------------
// Test Configuration
// -------------------------------------------

const TEST_CONFIG = {
  ADMIN_EMAIL: 'admin@test.com',
  ADMIN_PASS: 'admin123'
};

// Increase timeout for all tests
jest.setTimeout(30000);

// -------------------------------------------
// Helpers
// -------------------------------------------

let testCounter = 0;

function getUniqueIP() {
  testCounter++;
  return `192.168.${Math.floor(testCounter / 255)}.${testCounter % 255}`;
}

function getUniqueEmail() {
  return `test_${Date.now()}_${testCounter}@test.com`;
}

async function clearDB() {
  try {
    // Use transaction for faster cleanup
    await prisma.$transaction([
      prisma.analyticEvent.deleteMany(),
      prisma.aiConversation.deleteMany(),
      prisma.order.deleteMany(),
      prisma.addOn.deleteMany(),
      prisma.itinerary.deleteMany(),
      prisma.package.deleteMany(),
      prisma.lead.deleteMany(),
    ]);
  } catch (error) {
    // Silent fail - tables might not exist yet
  }
}

async function createTestAdmin() {
  const uniqueIP = getUniqueIP();
  const uniqueEmail = getUniqueEmail();
  
  return prisma.lead.create({
    data: {
      email: uniqueEmail,
      password: await bcrypt.hash(TEST_CONFIG.ADMIN_PASS, 10),
      role: 'admin',
      ip: uniqueIP,
      name: 'Test Admin'
    }
  });
}

function createToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function ipHeader(ip = null) {
  const testIP = ip || getUniqueIP();
  return { 'X-Forwarded-For': testIP };
}

// -------------------------------------------
// Test Setup
// -------------------------------------------

beforeAll(async () => {
  await prisma.$connect();
  await clearDB();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// -------------------------------------------
// AUTH TESTS
// -------------------------------------------

describe('AUTH TESTS', () => {
  beforeEach(async () => {
    await clearDB();
  });

  test('Create Admin', async () => {
    const res = await request(app).post('/auth/create-admin');
    expect([200, 400]).toContain(res.statusCode);
  }, 10000);

  test('Login works with test admin', async () => {
    const admin = await createTestAdmin();

    const res = await request(app).post('/auth/login').send({
      email: admin.email,
      password: TEST_CONFIG.ADMIN_PASS
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.access_token).toBeDefined();
  }, 10000);

  test('Login fails with bad credentials', async () => {
    const admin = await createTestAdmin();

    const res = await request(app).post('/auth/login').send({
      email: admin.email,
      password: 'wrongpassword'
    });

    expect(res.statusCode).toBe(401);
  }, 10000);

  test('Login requires email and password', async () => {
    const res1 = await request(app).post('/auth/login').send({ email: 'test@test.com' });
    const res2 = await request(app).post('/auth/login').send({ password: 'pass' });

    expect(res1.statusCode).toBe(400);
    expect(res2.statusCode).toBe(400);
  }, 10000);
});

// -------------------------------------------
// LEADS & AI CONVERSATIONS TESTS
// -------------------------------------------

describe('LEADS & AI CONVERSATIONS', () => {
  let admin, adminToken;
  
  beforeEach(async () => {
    admin = await createTestAdmin();
    adminToken = createToken(admin);
  }, 10000);

  test('Create lead with new IP', async () => {
    const res = await request(app)
      .post('/leads')
      .set(ipHeader('50.1.1.1'))
      .send({ 
        name: 'Test Lead 1', 
        email: 'lead1@test.com',
        phone: '1234567890'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Lead 1');
    expect(res.body.data.email).toBe('lead1@test.com');
  }, 10000);

  test('Update lead with same IP', async () => {
    const testIP = getUniqueIP();
    
    await request(app)
      .post('/leads')
      .set(ipHeader(testIP))
      .send({ name: 'Lead2', email: 'lead2@test.com' });

    const res = await request(app)
      .post('/leads')
      .set(ipHeader(testIP))
      .send({ phone: '9999999999', message: 'Interested in packages' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.phone).toBe('9999999999');
    expect(res.body.data.message).toBe('Interested in packages');
  }, 10000);

  test('Get leads requires admin authentication', async () => {
    const res = await request(app).get('/leads');
    expect(res.statusCode).toBe(401);
  }, 10000);

  test('Get leads works with admin token', async () => {
    await request(app)
      .post('/leads')
      .set(ipHeader('50.1.1.3'))
      .send({ name: 'Test Lead', email: 'test@test.com' });

    const res = await request(app)
      .get('/leads')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  }, 10000);

  test('Get leads with filters', async () => {
    await request(app)
      .post('/leads')
      .set(ipHeader('50.1.1.4'))
      .send({ name: 'New Lead', email: 'new@test.com', status: 'NEW' });

    await request(app)
      .post('/leads')
      .set(ipHeader('50.1.1.5'))
      .send({ name: 'Contacted Lead', email: 'contacted@test.com', status: 'CONTACTED' });

    const res = await request(app)
      .get('/leads?status=NEW')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.every(lead => lead.status === 'NEW')).toBe(true);
  }, 10000);

  test('Update lead status with valid data', async () => {
    const lead = await prisma.lead.create({
      data: {
        name: 'Status Test Lead',
        email: 'status@test.com',
        ip: getUniqueIP(),
        role: 'lead'
      }
    });

    const res = await request(app)
      .put(`/leads/${lead.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONTACTED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('CONTACTED');
    expect(res.body.message).toContain('updated');
  }, 10000);

  test('Update lead status with invalid status', async () => {
    const lead = await prisma.lead.create({
      data: {
        name: 'Invalid Status Lead',
        email: 'invalid@test.com',
        ip: getUniqueIP(),
        role: 'lead'
      }
    });

    const res = await request(app)
      .put(`/leads/${lead.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVALID_STATUS' });

    expect(res.statusCode).toBe(400);
  }, 10000);

  test('Export leads CSV', async () => {
    await request(app)
      .post('/leads')
      .set(ipHeader('50.1.1.8'))
      .send({ name: 'CSV Lead', email: 'csv@test.com' });

    const res = await request(app)
      .get('/leads/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
  }, 10000);

  test('Store and retrieve AI conversations', async () => {
    const lead = await prisma.lead.create({
      data: {
        name: 'AI Test Lead',
        email: 'ai@test.com',
        ip: getUniqueIP(),
        role: 'lead'
      }
    });

    const storeRes = await request(app)
      .post(`/leads/${lead.id}/conversations`)
      .send({
        userMessage: 'Hello, I need help',
        aiMessage: 'Hi! How can I assist you today?',
        meta: { type: 'greeting', platform: 'web' }
      });

    expect(storeRes.statusCode).toBe(200);
    expect(storeRes.body.data).toHaveProperty('id');

    const getRes = await request(app)
      .get(`/leads/${lead.id}/conversations`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(Array.isArray(getRes.body.data)).toBe(true);
    expect(getRes.body.data.length).toBeGreaterThan(0);
  }, 10000);
});

// -------------------------------------------
// PACKAGES CRUD TESTS
// -------------------------------------------

describe('PACKAGES CRUD', () => {
  let adminToken;
  
  beforeEach(async () => {
    const admin = await createTestAdmin();
    adminToken = createToken(admin);
  }, 10000);

  test('Create package with required fields', async () => {
    const packageData = {
      title: 'Test Sports Package',
      basePrice: 1000,
      location: 'Test City',
      description: 'Amazing sports travel experience',
      eventDate: new Date().toISOString(),
      isFeatured: true
    };

    const res = await request(app)
      .post('/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(packageData);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe(packageData.title);
    expect(res.body.data.basePrice).toBe(packageData.basePrice);
  }, 10000);

  test('List packages (public)', async () => {
    await prisma.package.create({
      data: {
        title: 'Public Test Package',
        basePrice: 500,
        location: 'Public City'
      }
    });

    const res = await request(app).get('/packages');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  }, 10000);

  test('Get featured packages', async () => {
    await prisma.package.create({
      data: {
        title: 'Featured Package',
        basePrice: 1500,
        location: 'Featured City',
        isFeatured: true
      }
    });

    const res = await request(app).get('/packages/featured');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.every(pkg => pkg.isFeatured === true)).toBe(true);
  }, 10000);

  test('Update package', async () => {
    const pkg = await prisma.package.create({
      data: {
        title: 'Package to Update',
        basePrice: 800,
        location: 'Update City'
      }
    });

    const res = await request(app)
      .put(`/packages/${pkg.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        title: 'Updated Package Title',
        basePrice: 900 
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Package Title');
    expect(res.body.data.basePrice).toBe(900);
  }, 10000);

  test('Delete package', async () => {
    const pkg = await prisma.package.create({
      data: {
        title: 'Package to Delete',
        basePrice: 700,
        location: 'Delete City'
      }
    });

    const res = await request(app)
      .delete(`/packages/${pkg.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const deletedPackage = await prisma.package.findUnique({
      where: { id: pkg.id }
    });
    expect(deletedPackage).toBeNull();
  }, 10000);

  test('Package operations require admin auth', async () => {
    const res1 = await request(app).post('/packages').send({ title: 'Test' });
    const res2 = await request(app).put('/packages/123').send({ title: 'Test' });
    const res3 = await request(app).delete('/packages/123');

    expect(res1.statusCode).toBe(401);
    expect(res2.statusCode).toBe(401);
    expect(res3.statusCode).toBe(401);
  }, 10000);
});

// -------------------------------------------
// ITINERARIES CRUD TESTS
// -------------------------------------------

describe('ITINERARIES CRUD', () => {
  let adminToken;
  
  beforeEach(async () => {
    const admin = await createTestAdmin();
    adminToken = createToken(admin);
  }, 10000);

  test('Create itinerary', async () => {
    const res = await request(app)
      .post('/itineraries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Itinerary',
        description: 'Detailed itinerary description',
        basePrice: 200,
        packageIds: []
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Test Itinerary');
  }, 10000);

  test('List itineraries (public)', async () => {
    await prisma.itinerary.create({
      data: {
        title: 'Public Itinerary',
        description: 'Test description',
        basePrice: 300
      }
    });

    const res = await request(app).get('/itineraries');

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  }, 10000);

  test('Update itinerary', async () => {
    const itinerary = await prisma.itinerary.create({
      data: {
        title: 'Itinerary to Update',
        description: 'Original description',
        basePrice: 400
      }
    });

    const res = await request(app)
      .put(`/itineraries/${itinerary.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        title: 'Updated Itinerary',
        basePrice: 450 
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Itinerary');
  }, 10000);

  test('Delete itinerary', async () => {
    const itinerary = await prisma.itinerary.create({
      data: {
        title: 'Itinerary to Delete',
        description: 'Delete me',
        basePrice: 500
      }
    });

    const res = await request(app)
      .delete(`/itineraries/${itinerary.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  }, 10000);
});

// -------------------------------------------
// ADDONS CRUD TESTS
// -------------------------------------------

describe('ADDONS CRUD', () => {
  let adminToken;
  
  beforeEach(async () => {
    const admin = await createTestAdmin();
    adminToken = createToken(admin);
  }, 10000);

  test('Create addon', async () => {
    const res = await request(app)
      .post('/addons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Addon',
        description: 'Addon description',
        basePrice: 50,
        packageIds: []
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Test Addon');
  }, 10000);

  test('List addons (public)', async () => {
    await prisma.addOn.create({
      data: {
        title: 'Public Addon',
        basePrice: 75
      }
    });

    const res = await request(app).get('/addons');

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  }, 10000);

  test('Update addon', async () => {
    const addon = await prisma.addOn.create({
      data: {
        title: 'Addon to Update',
        basePrice: 60
      }
    });

    const res = await request(app)
      .put(`/addons/${addon.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        title: 'Updated Addon',
        basePrice: 65 
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Addon');
  }, 10000);

  test('Delete addon', async () => {
    const addon = await prisma.addOn.create({
      data: {
        title: 'Addon to Delete',
        basePrice: 70
      }
    });

    const res = await request(app)
      .delete(`/addons/${addon.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  }, 10000);
});

// -------------------------------------------
// ORDERS TESTS
// -------------------------------------------

describe('ORDERS', () => {
  let lead, pkg, adminToken;
  
  beforeEach(async () => {
    const admin = await createTestAdmin();
    adminToken = createToken(admin);
    
    lead = await prisma.lead.create({
      data: { 
        name: 'Order Test Lead', 
        email: 'order@test.com',
        ip: getUniqueIP(),
        role: 'lead'
      }
    });
    
    pkg = await prisma.package.create({
      data: { 
        title: 'Order Test Package', 
        basePrice: 1000, 
        location: 'Order City' 
      }
    });
  }, 10000);

  test('Create order (public)', async () => {
    const res = await request(app)
      .post('/orders')
      .send({
        leadId: lead.id,
        packageId: pkg.id,
        status: 'BOOKED',
        meta: { paymentMethod: 'card' }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('BOOKED');
    expect(res.body.data.leadId).toBe(lead.id);
    expect(res.body.data.packageId).toBe(pkg.id);
  }, 10000);

  test('Admin can fetch orders', async () => {
    await prisma.order.create({
      data: {
        leadId: lead.id,
        packageId: pkg.id,
        status: 'BOOKED'
      }
    });

    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  }, 10000);
});

// -------------------------------------------
// ANALYTICS TESTS
// -------------------------------------------

describe('ANALYTICS', () => {
  let adminToken;
  
  beforeEach(async () => {
    const admin = await createTestAdmin();
    adminToken = createToken(admin);

    await prisma.package.create({
      data: { 
        title: 'Analytics Test Package', 
        basePrice: 1200, 
        location: 'Analytics City' 
      }
    });
  }, 10000);

  test('Track analytics event', async () => {
    const pkg = await prisma.package.findFirst();
    
    const res = await request(app)
      .post('/analytics/events')
      .set(ipHeader('199.1.1.1'))
      .send({
        type: 'PAGE_VIEW',
        page: '/packages',
        section: 'featured',
        element: 'package-card',
        packageId: pkg.id,
        userAgent: 'test-agent'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.type).toBe('PAGE_VIEW');
  }, 10000);

  test('Get analytics summary (admin)', async () => {
    await prisma.lead.create({
      data: {
        name: 'Analytics Lead',
        email: 'analytics@test.com',
        ip: getUniqueIP(),
        role: 'lead',
        status: 'NEW'
      }
    });

    const res = await request(app)
      .get('/analytics/summary?days=7')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('totalLeads');
    expect(res.body.data).toHaveProperty('conversionRate');
    expect(res.body.data).toHaveProperty('last7Days');
  }, 10000);

  test('Get popular packages (admin)', async () => {
    const pkg = await prisma.package.findFirst();
    
    await prisma.analyticEvent.create({
      data: {
        type: 'PACKAGE_VIEW',
        page: '/packages',
        packageId: pkg.id,
        ip: getUniqueIP()
      }
    });

    const res = await request(app)
      .get('/analytics/popular-packages?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  }, 10000);
});

// -------------------------------------------
// AI ROUTES TESTS (Basic)
// -------------------------------------------

describe('AI ROUTES', () => {
  test('AI chat requires message', async () => {
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader('200.1.1.1'))
      .send({});

    expect(res.statusCode).toBe(400);
  }, 10000);

  test('Admin AI chat requires authentication', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .send({ message: 'test' });

    expect(res.statusCode).toBe(401);
  }, 10000);
});