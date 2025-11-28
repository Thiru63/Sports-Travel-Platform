require('dotenv').config({ path: '.env.test' });

// Mock Groq API for consistent, fast testing
jest.mock('groq-sdk', () => {
  return {
    Groq: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockImplementation(({ messages }) => {
            const userMessage = messages[0].content.toLowerCase();
            
            // Lead conversation responses
            if (userMessage.includes('hello') || userMessage.includes('hi')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'Hello! I\'m your sports travel assistant. I can help you find packages, make recommendations, or assist with bookings. How can I help you today?'
                  }
                }]
              });
            }
            
            if (userMessage.includes('recommend') && userMessage.includes('football')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'I recommend our FIFA World Cup 2026 package! It includes match tickets, accommodation, and exclusive fan experiences. The package starts at $1800.'
                  }
                }]
              });
            }
            
            if (userMessage.includes('recommend') && userMessage.includes('budget')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'Based on your budget, I suggest our Wimbledon Tennis package at $1200 or our Olympic Experience package at $2500. Could you tell me which sports you prefer?'
                  }
                }]
              });
            }
            
            if (userMessage.includes('book') && userMessage.includes('name') && userMessage.includes('email')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'Thank you John! I have your details: john@example.com, phone 1234567890. I\'ve booked the Olympic package for you. You\'ll receive confirmation email shortly.'
                  }
                }]
              });
            }
            
            if (userMessage.includes('book') && !userMessage.includes('name')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'I\'d be happy to help you book a package! To get started, I\'ll need your name, email address, and phone number. Could you please provide these details?'
                  }
                }]
              });
            }
            
            if (userMessage.includes('weather') || userMessage.includes('capital')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'I don\'t have information about that topic. I specialize in helping with sports travel packages, recommendations, and bookings.'
                  }
                }]
              });
            }
            
            if (userMessage.includes('john') && userMessage.includes('example.com')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'Thank you John! I\'ve updated your contact information. Your email is john@example.com and phone is 1234567890. Which package would you like to proceed with?'
                  }
                }]
              });
            }
            
            // Admin conversation responses
            if (userMessage.includes('seo title')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: '1. "Paris 2024 Olympics - Premium Sports Travel Experience"\n2. "World Cup 2026 USA - Ultimate Football Travel Packages"\n3. "Wimbledon Championships - Luxury Tennis Getaway"'
                  }
                }]
              });
            }
            
            if (userMessage.includes('description')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'Experience the thrill of live sports with our exclusive travel packages. We offer premium access to major sporting events worldwide, including Olympics, World Cup, Wimbledon, and Super Bowl. Our packages include tickets, accommodation, transportation, and unique local experiences.'
                  }
                }]
              });
            }
            
            if (userMessage.includes('business performance') || userMessage.includes('analytics')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'Based on your current data:\n- Total Leads: 15\n- Conversion Rate: 12%\n- Popular Package: Olympic Games Paris 2024\n- Suggestion: Focus on football packages as they show high interest but lower conversion.'
                  }
                }]
              });
            }
            
            if (userMessage.includes('lead analysis')) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: 'Lead Analysis:\n- 60% of leads are interested in football packages\n- High-value leads prefer Olympic packages\n- Contact rate for new leads is 45%\n- Recommendation: Implement automated follow-up for football package inquiries'
                  }
                }]
              });
            }
            
            // Default response
            return Promise.resolve({
              choices: [{
                message: {
                  content: 'I can help you with sports travel packages. Would you like information about our packages, personalized recommendations, or assistance with booking?'
                }
              }]
            });
          })
        }
      }
    }))
  };
});

const request = require('supertest');
const app = require('../server');
const prisma = require('../utils/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.setTimeout(30000);

// Test Configuration
const TEST_CONFIG = {
  ADMIN_EMAIL: 'admin@test.com',
  ADMIN_PASS: 'admin123'
};

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
    // Silent fail
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

async function createTestPackages() {
  await prisma.package.createMany({
    data: [
      {
        title: 'Olympic Games Paris 2024',
        basePrice: 2500,
        location: 'Paris, France',
        description: 'Experience the Olympic Games in Paris with premium access',
        category: 'Olympics',
        isFeatured: true
      },
      {
        title: 'FIFA World Cup 2026',
        basePrice: 1800,
        location: 'Various Cities, USA',
        description: 'Watch the world cup matches with exclusive packages',
        category: 'Football',
        isFeatured: true
      },
      {
        title: 'Wimbledon Tennis Championship',
        basePrice: 1200,
        location: 'London, UK',
        description: 'Premium Wimbledon experience with center court tickets',
        category: 'Tennis'
      },
      {
        title: 'Super Bowl Experience',
        basePrice: 2200,
        location: 'Miami, USA',
        description: 'Complete Super Bowl weekend with parties and game tickets',
        category: 'American Football'
      }
    ]
  });
}

// Test Setup
beforeAll(async () => {
  await prisma.$connect();
  await clearDB();
  await createTestPackages();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// =============================================
// LEAD AI CONVERSATION TESTS
// =============================================

describe('LEAD AI CONVERSATIONS - COMPLETE FLOW', () => {
  test('New lead starts conversation and gets appropriate greeting', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Hello, I need help with sports travel'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('type');
    expect(res.body.data).toHaveProperty('lead');
    expect(res.body.data.lead.ip).toBe(testIP);
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/hello|hi|help|sports|travel/);
  }, 10000);

  test('Lead asks about available packages', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'What sports travel packages do you offer?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('chat');
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/package|sports|travel|offer/);
    expect(message.length).toBeGreaterThan(50);
  }, 10000);

  test('Lead requests recommendations without specific criteria', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Can you recommend some packages?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['trip_advisor', 'chat']).toContain(res.body.data.type);
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/recommend|suggest|package/);
  }, 10000);

  test('Lead requests recommendations with specific criteria', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'I want football packages in USA'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('trip_advisor');
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/football|world cup|usa|recommend/);
  }, 10000);

  test('Lead requests recommendations with budget criteria', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Looking for packages around $2000 budget'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['trip_advisor', 'chat']).toContain(res.body.data.type);
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/budget|\$|2000|package/);
  }, 10000);

  test('Lead expresses booking intent without contact info', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'I want to book the Olympic package'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('booking');
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/book|name|email|phone|contact/);
  }, 10000);

  test('Lead provides contact information during conversation', async () => {
    const testIP = getUniqueIP();
    
    // Start conversation
    await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({ message: 'I want to book a package' });

    // Provide contact info
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'My name is John Doe, email john@example.com, phone 1234567890'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Verify lead was updated with contact info through LLM extraction
    const lead = await prisma.lead.findFirst({
      where: { ip: testIP }
    });
    
    // The LLM should extract and update contact information
    expect(lead.name).toBe('John Doe');
    expect(lead.email).toBe('john@example.com');
    expect(lead.phone).toBe('1234567890');
  }, 10000);

  test('Lead asks non-product related questions', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'What is the weather like in Paris?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/don't know|don't have knowledge|specialize/);
    expect(message).toMatch(/sports travel/);
  }, 10000);

  test('Maintains conversation context across multiple messages', async () => {
    const testIP = getUniqueIP();
    
    // Message 1: Express interest in tennis
    await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({ message: 'I am interested in tennis packages' });

    // Message 2: Follow-up about specific tournament
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({ message: 'What about Wimbledon?' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/wimbledon|tennis|package/);
  }, 10000);

  test('Handles empty or invalid messages gracefully', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: ''
      });

    expect(res.statusCode).toBe(400);
  }, 10000);

  test('Stores complete conversation history for lead', async () => {
    const testIP = getUniqueIP();
    const leadEmail = 'history@test.com';
    
    // Create lead first
    await request(app)
      .post('/leads')
      .set(ipHeader(testIP))
      .send({
        name: 'History Test',
        email: leadEmail
      });

    // Have multiple conversations
    const messages = [
      'Hello, I need sports packages',
      'Specifically for football',
      'What about World Cup?',
      'My budget is $1500'
    ];

    for (const msg of messages) {
      await request(app)
        .post('/ai/chat')
        .set(ipHeader(testIP))
        .send({ message: msg });
    }

    // Verify all conversations stored
    const lead = await prisma.lead.findFirst({
      where: { email: leadEmail },
      include: { aiConversations: { orderBy: { createdAt: 'asc' } } }
    });

    expect(lead.aiConversations).toHaveLength(4);
    expect(lead.aiConversations[0].userMessage).toBe('Hello, I need sports packages');
    expect(lead.aiConversations[1].userMessage).toBe('Specifically for football');
    expect(lead.aiConversations[2].userMessage).toBe('What about World Cup?');
    expect(lead.aiConversations[3].userMessage).toBe('My budget is $1500');
    
    // Verify metadata is stored
    expect(lead.aiConversations[0].meta).toHaveProperty('type');
    expect(lead.aiConversations[0].meta).toHaveProperty('intent');
  }, 15000);
});

// =============================================
// ADMIN AI CONVERSATION TESTS
// =============================================

describe('ADMIN AI CONVERSATIONS - COMPLETE FLOW', () => {
  let admin, adminToken;

  beforeEach(async () => {
    admin = await createTestAdmin();
    adminToken = createToken(admin);
    
    // Create test data for admin context
    await prisma.lead.createMany({
      data: [
        {
          name: 'High Value Lead',
          email: 'high@test.com',
          ip: getUniqueIP(),
          role: 'lead',
          leadScore: 85,
          status: 'CONTACTED',
          packageRecommendedByAi: ['Olympic Games Paris 2024']
        },
        {
          name: 'New Inquiry',
          email: 'new@test.com',
          ip: getUniqueIP(),
          role: 'lead',
          leadScore: 45,
          status: 'NEW',
          packageRecommendedByAi: ['FIFA World Cup 2026']
        },
        {
          name: 'Converted Customer',
          email: 'customer@test.com',
          ip: getUniqueIP(),
          role: 'lead',
          leadScore: 90,
          status: 'CONVERTED',
          packageRecommendedByAi: ['Wimbledon Tennis Championship']
        }
      ]
    });

    // Create orders
    const leads = await prisma.lead.findMany({ where: { role: 'lead' } });
    const packages = await prisma.package.findMany();
    
    await prisma.order.createMany({
      data: [
        {
          leadId: leads[0].id,
          packageId: packages[0].id,
          status: 'BOOKED'
        },
        {
          leadId: leads[1].id,
          packageId: packages[1].id,
          status: 'PENDING'
        }
      ]
    });

    // Create analytics events
    await prisma.analyticEvent.createMany({
      data: [
        {
          type: 'PAGE_VIEW',
          page: '/packages',
          packageId: packages[0].id,
          ip: getUniqueIP()
        },
        {
          type: 'CTA_CLICK',
          page: '/packages',
          section: 'featured',
          packageId: packages[1].id,
          ip: getUniqueIP()
        }
      ]
    });
  }, 10000);

  test('Admin asks for business insights and performance summary', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Give me a summary of our business performance'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('admin_assistant');
    
    const response = res.body.data.response.toLowerCase();
    expect(response).toMatch(/lead|package|conversion|analytics|suggestion/);
    expect(response.length).toBeGreaterThan(100);
  }, 10000);

  test('Admin requests content generation - SEO titles', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Create SEO titles for our Olympic packages'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const response = res.body.data.response;
    expect(response).toMatch(/paris|olympic|title|seo/i);
    expect(response.split('\n').length).toBeGreaterThan(2);
  }, 10000);

  test('Admin requests content generation - descriptions', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Write a description for our sports travel packages'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const response = res.body.data.response;
    expect(response).toMatch(/sports|travel|package|experience/i);
    expect(response.length).toBeGreaterThan(150);
  }, 10000);

  test('Admin asks for lead analysis and insights', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Analyze our current leads and suggest improvements'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('admin_assistant');
    
    const response = res.body.data.response.toLowerCase();
    expect(response).toMatch(/lead|analysis|suggest|recommend|improve/);
  }, 10000);

  test('Admin asks for product suggestions and improvements', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'What new sports packages should we offer?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const response = res.body.data.response.toLowerCase();
    expect(response).toMatch(/package|suggest|offer|sports/);
  }, 10000);

  test('Admin asks for analytics interpretation', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'What do our analytics data tell us about customer behavior?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('admin_assistant');
    
    const response = res.body.data.response.toLowerCase();
    expect(response).toMatch(/analytics|customer|behavior|insight/);
  }, 10000);

  test('Admin asks non-business related questions', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'What is the capital of France?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const response = res.body.data.response.toLowerCase();
    expect(response).toMatch(/specialize|admin|business|travel/);
    expect(response).not.toMatch(/paris/); // Should not answer the question
  }, 10000);

  test('Maintains admin conversation context across queries', async () => {
    // First message about marketing
    await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'I need help with marketing strategy'
      });

    // Follow-up about specific platform
    const res = await request(app)
      .post('/ai/admin/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Specifically for social media campaigns'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const response = res.body.data.response.toLowerCase();
    expect(response).toMatch(/social media|marketing|campaign/);
  }, 10000);

  test('Admin AI requires authentication', async () => {
    const res = await request(app)
      .post('/ai/admin/chat')
      .send({
        message: 'Help me with business insights'
      });

    expect(res.statusCode).toBe(401);
  }, 10000);

  test('Stores complete admin conversation history', async () => {
    // Have multiple admin conversations
    const adminMessages = [
      'First admin query about business',
      'Second query about leads',
      'Third query about packages'
    ];

    for (const msg of adminMessages) {
      await request(app)
        .post('/ai/admin/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: msg });
    }

    // Get admin conversations
    const conversations = await prisma.aiConversation.findMany({
      where: { leadId: admin.id },
      orderBy: { createdAt: 'asc' }
    });

    expect(conversations).toHaveLength(3);
    expect(conversations[0].userMessage).toBe('First admin query about business');
    expect(conversations[1].userMessage).toBe('Second query about leads');
    expect(conversations[2].userMessage).toBe('Third query about packages');
    
    // Verify admin-specific metadata
    expect(conversations[0].meta.type).toBe('admin_assistant');
  }, 10000);
});

// =============================================
// EDGE CASE AND INTEGRATION TESTS
// =============================================

describe('AI EDGE CASES AND INTEGRATION', () => {
  test('Lead with existing data gets personalized responses', async () => {
    const testIP = getUniqueIP();
    const leadEmail = 'personalized@test.com';
    
    // Create lead with existing orders and recommendations
    await request(app)
      .post('/leads')
      .set(ipHeader(testIP))
      .send({
        name: 'Personalized Lead',
        email: leadEmail,
        packageRecommendedByAi: ['Olympic Games Paris 2024'],
        leadScore: 75
      });

    // Create an order for this lead
    const lead = await prisma.lead.findFirst({ where: { email: leadEmail } });
    const pkg = await prisma.package.findFirst();
    
    await prisma.order.create({
      data: {
        leadId: lead.id,
        packageId: pkg.id,
        status: 'BOOKED'
      }
    });

    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'What packages would you recommend based on my history?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Response should be personalized based on history
    const message = res.body.data.message.toLowerCase();
    expect(message).toMatch(/recommend|suggest|history|previous/);
  }, 10000);

  test('Handles very long messages gracefully', async () => {
    const testIP = getUniqueIP();
    const longMessage = 'I am looking for '.repeat(50) + 'sports packages for football in USA with budget around $2000 for December 2024';
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: longMessage
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Response should be coherent despite long input
    const response = res.body.data.message;
    expect(response.length).toBeLessThan(1000); // Reasonable length
    expect(response).not.toMatch(/error|fail/);
  }, 10000);

  test('Handles special characters and formatting', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'I need packages for 🏈 NFL games! Budget: $1000-$2000 💰 Dates: Dec 2024 📅'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const response = res.body.data.message;
    // Should handle special characters gracefully
    expect(response).not.toMatch(/undefined|null|\[object/);
  }, 10000);

  test('Multiple leads can have separate conversations simultaneously', async () => {
    const ip1 = getUniqueIP();
    const ip2 = getUniqueIP();
    const ip3 = getUniqueIP();
    
    // Lead 1: Football interest
    const res1 = await request(app)
      .post('/ai/chat')
      .set(ipHeader(ip1))
      .send({ message: 'I like football packages' });

    // Lead 2: Tennis interest  
    const res2 = await request(app)
      .post('/ai/chat')
      .set(ipHeader(ip2))
      .send({ message: 'I prefer tennis packages' });

    // Lead 3: General inquiry
    const res3 = await request(app)
      .post('/ai/chat')
      .set(ipHeader(ip3))
      .send({ message: 'What sports packages do you have?' });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    expect(res3.statusCode).toBe(200);
    
    // Verify separate leads were created
    const lead1 = await prisma.lead.findFirst({ where: { ip: ip1 } });
    const lead2 = await prisma.lead.findFirst({ where: { ip: ip2 } });
    const lead3 = await prisma.lead.findFirst({ where: { ip: ip3 } });
    
    expect(lead1).toBeDefined();
    expect(lead2).toBeDefined();
    expect(lead3).toBeDefined();
    expect(lead1.id).not.toBe(lead2.id);
    expect(lead2.id).not.toBe(lead3.id);
    
    // Verify separate conversations
    const conv1 = await prisma.aiConversation.findMany({ where: { leadId: lead1.id } });
    const conv2 = await prisma.aiConversation.findMany({ where: { leadId: lead2.id } });
    const conv3 = await prisma.aiConversation.findMany({ where: { leadId: lead3.id } });
    
    expect(conv1).toHaveLength(1);
    expect(conv2).toHaveLength(1);
    expect(conv3).toHaveLength(1);
  }, 15000);

  test('Complete booking flow with contact extraction', async () => {
    const testIP = getUniqueIP();
    
    // Step 1: Initial inquiry
    const res1 = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({ message: 'I want to book Olympics package' });

    expect(res1.body.data.type).toBe('booking');
    expect(res1.body.data.message.toLowerCase()).toMatch(/name|email|contact/);

    // Step 2: Provide contact info
    const res2 = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({ 
        message: 'My name is Alice Johnson, email alice@test.com, phone 555-123-4567' 
      });

    // Step 3: Verify contact extraction and booking progression
    const message2 = res2.body.data.message.toLowerCase();
    expect(message2).toMatch(/alice|thank you|confirm|book|package/);
    
    // Verify lead was updated with contact info through LLM extraction
    const lead = await prisma.lead.findFirst({ where: { ip: testIP } });
    expect(lead.name).toBe('Alice Johnson');
    expect(lead.email).toBe('alice@test.com');
    expect(lead.phone).toBe('555-123-4567');
  }, 15000);
});

// =============================================
// PERFORMANCE AND RELIABILITY TESTS
// =============================================

describe('AI PERFORMANCE AND RELIABILITY', () => {
  test('AI responses are returned within reasonable time', async () => {
    const testIP = getUniqueIP();
    const startTime = Date.now();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Quick test message'
      });

    const responseTime = Date.now() - startTime;
    
    expect(res.statusCode).toBe(200);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds with mock
  }, 10000);

  test('System handles concurrent AI requests', async () => {
    const requests = [];
    
    // Create 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      requests.push(
        request(app)
          .post('/ai/chat')
          .set(ipHeader(getUniqueIP()))
          .send({ message: `Concurrent test ${i}` })
      );
    }
    
    const results = await Promise.all(requests);
    
    // All requests should succeed
    results.forEach(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  }, 10000);

  test('Database integrity maintained during AI conversations', async () => {
    const testIP = getUniqueIP();
    
    // Have multiple conversations
    await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({ message: 'First message' });

    await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({ message: 'Second message' });

    // Verify database state
    const lead = await prisma.lead.findFirst({
      where: { ip: testIP },
      include: { 
        aiConversations: true,
        orders: true 
      }
    });

    expect(lead).toBeDefined();
    expect(lead.aiConversations).toHaveLength(2);
    expect(lead.role).toBe('lead');
    expect(lead.status).toBe('NEW');
    
    // Verify conversation order and content
    const conversations = await prisma.aiConversation.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' }
    });
    
    expect(conversations[0].userMessage).toBe('First message');
    expect(conversations[1].userMessage).toBe('Second message');
    expect(conversations[0].createdAt.getTime()).toBeLessThan(conversations[1].createdAt.getTime());
  }, 10000);
});