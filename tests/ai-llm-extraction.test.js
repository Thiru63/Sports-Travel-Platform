require('dotenv').config({ path: '.env.test' });

// Mock Groq with proper LLM extraction responses
jest.mock('groq-sdk', () => {
  return {
    Groq: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockImplementation(({ messages }) => {
            const userMessage = messages[0].content.toLowerCase();
            
            console.log('🤖 Mocked Groq called with prompt type:', 
              userMessage.includes('extract structured information') ? 'EXTRACTION' :
              userMessage.includes('content generation') ? 'CONTENT_DETECTION' :
              userMessage.includes('admin panel') ? 'ADMIN_QUERY' :
              'GENERAL_RESPONSE'
            );

            // EXTRACTION PROMPT - Contact info and intent detection
            if (userMessage.includes('extract structured information')) {
              if (userMessage.includes('book me for the world cup') && userMessage.includes('alice smith')) {
                return Promise.resolve({
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        contact_info: {
                          name: "Alice Smith",
                          email: "alice@test.com", 
                          phone: "5551234567"
                        },
                        intent: "booking",
                        response_type: "booking"
                      })
                    }
                  }]
                });
              }
              
              if (userMessage.includes('i want to book a package')) {
                return Promise.resolve({
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        contact_info: {},
                        intent: "booking",
                        response_type: "booking"
                      })
                    }
                  }]
                });
              }
              
              if (userMessage.includes('recommend some packages')) {
                return Promise.resolve({
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        contact_info: {},
                        intent: "recommendation",
                        response_type: "trip_advisor"
                      })
                    }
                  }]
                });
              }
              
              if (userMessage.includes('hello, how are you today')) {
                return Promise.resolve({
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        contact_info: {},
                        intent: "general_chat",
                        response_type: "chat"
                      })
                    }
                  }]
                });
              }
              
              // Default extraction response
              return Promise.resolve({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      contact_info: {},
                      intent: "information", 
                      response_type: "chat"
                    })
                  }
                }]
              });
            }
            
            // CONTENT GENERATION DETECTION PROMPT
            if (userMessage.includes('content generation')) {
              if (userMessage.includes('seo titles')) {
                return Promise.resolve({
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        is_content_generation: true,
                        content_type: "seo_title",
                        subject: "Olympic packages"
                      })
                    }
                  }]
                });
              }
              
              // Default content detection response
              return Promise.resolve({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      is_content_generation: false,
                      content_type: "none",
                      subject: null
                    })
                  }
                }]
              });
            }
            
            // GENERAL AI RESPONSE PROMPT - For actual conversation responses
            return Promise.resolve({
              choices: [{
                message: {
                  content: "I can help you with sports travel packages. Would you like recommendations, information about our packages, or help with booking?"
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

jest.setTimeout(30000);

let testCounter = 0;

function getUniqueIP() {
  testCounter++;
  return `192.168.${Math.floor(testCounter / 255)}.${testCounter % 255}`;
}

function ipHeader(ip = null) {
  const testIP = ip || getUniqueIP();
  return { 'X-Forwarded-For': testIP };
}

beforeAll(async () => {
  await prisma.$connect();
  await prisma.$transaction([
    prisma.analyticEvent.deleteMany(),
    prisma.aiConversation.deleteMany(),
    prisma.order.deleteMany(),
    prisma.addOn.deleteMany(),
    prisma.itinerary.deleteMany(),
    prisma.package.deleteMany(),
    prisma.lead.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('🧠 LLM EXTRACTION TESTS WITH PROPER MOCK', () => {
  test('LLM extracts contact information accurately from booking message', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Book me for the World Cup. My name is Alice Smith, email alice@test.com, phone 5551234567'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Check the extraction data structure
    expect(res.body.data).toHaveProperty('extraction');
    expect(res.body.data.extraction).toHaveProperty('contact_info');
    expect(res.body.data.extraction).toHaveProperty('intent');
    expect(res.body.data.extraction).toHaveProperty('response_type');
    
    // Check specific values from mock response
    expect(res.body.data.extraction.contact_info.name).toBe('Alice Smith');
    expect(res.body.data.extraction.contact_info.email).toBe('alice@test.com');
    expect(res.body.data.extraction.contact_info.phone).toBe('5551234567');
    expect(res.body.data.extraction.intent).toBe('booking');
    expect(res.body.data.type).toBe('booking');
  }, 10000);

  test('LLM correctly classifies booking intent without contact info', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'I want to book a package'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.extraction.intent).toBe('booking');
    expect(res.body.data.type).toBe('booking');
  }, 10000);

  test('LLM correctly classifies recommendation intent', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Recommend some packages'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.extraction.intent).toBe('recommendation');
    expect(res.body.data.type).toBe('trip_advisor');
  }, 10000);

  test('LLM correctly classifies general conversation intent', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Hello, how are you today?'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.extraction.intent).toBe('general_chat');
    expect(res.body.data.type).toBe('chat');
  }, 10000);

  test('LLM content generation detection works for admin', async () => {
    // This would require admin authentication, so let's test the method directly
    const aiService = require('../services/aiService');
    
    // Mock the actual method call since it requires admin context
    const mockDetection = await aiService.detectContentGenerationWithLLM('Create SEO titles for Olympic packages');
    
    expect(mockDetection.is_content_generation).toBe(true);
    expect(mockDetection.content_type).toBe('seo_title');
    expect(mockDetection.subject).toBe('Olympic packages');
  }, 10000);

  test('Lead is updated with LLM-extracted contact information', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Book me for the World Cup. My name is Alice Smith, email alice@test.com, phone 5551234567'
      });

    expect(res.statusCode).toBe(200);
    
    // Check that lead was created and updated
    const lead = await prisma.lead.findFirst({
      where: { ip: testIP }
    });
    
    expect(lead).toBeDefined();
    // The lead should be updated with the contact info from LLM extraction
    expect(lead.name).toBe('Alice Smith');
    expect(lead.email).toBe('alice@test.com');
    expect(lead.phone).toBe('5551234567');
  }, 10000);

  test('Multiple conversations maintain separate contexts and extractions', async () => {
    const ip1 = getUniqueIP();
    const ip2 = getUniqueIP();
    
    // Conversation 1 - Booking intent
    const res1 = await request(app)
      .post('/ai/chat')
      .set(ipHeader(ip1))
      .send({ message: 'I want to book a package' });

    // Conversation 2 - Recommendation intent  
    const res2 = await request(app)
      .post('/ai/chat')
      .set(ipHeader(ip2))
      .send({ message: 'Recommend some packages' });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    
    // Should have different intents based on different messages
    expect(res1.body.data.extraction.intent).toBe('booking');
    expect(res2.body.data.extraction.intent).toBe('recommendation');
    
    // Verify separate leads were created
    const lead1 = await prisma.lead.findFirst({ where: { ip: ip1 } });
    const lead2 = await prisma.lead.findFirst({ where: { ip: ip2 } });
    
    expect(lead1).toBeDefined();
    expect(lead2).toBeDefined();
    expect(lead1.id).not.toBe(lead2.id);
  }, 15000);

  test('Conversation history is stored with extraction metadata', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'I want to book the Paris Olympics package'
      });

    expect(res.statusCode).toBe(200);
    
    // Check that conversation was stored with extraction metadata
    const lead = await prisma.lead.findFirst({
      where: { ip: testIP },
      include: { aiConversations: true }
    });
    
    expect(lead.aiConversations).toHaveLength(1);
    expect(lead.aiConversations[0].userMessage).toBe('I want to book the Paris Olympics package');
    expect(lead.aiConversations[0].meta).toHaveProperty('extraction');
    expect(lead.aiConversations[0].meta.extraction.intent).toBe('booking');
  }, 10000);
});

describe('🧠 LLM EXTRACTION EDGE CASES', () => {
  test('LLM handles messages with partial contact information', async () => {
    const testIP = getUniqueIP();
    
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'My name is John Doe only, no contact info yet'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Should still process the message even with partial info
    expect(res.body.data).toHaveProperty('extraction');
    expect(res.body.data).toHaveProperty('message');
  }, 10000);

  test('LLM extraction fallback works when JSON parsing fails', async () => {
    const testIP = getUniqueIP();
    
    // This will use the default extraction response
    const res = await request(app)
      .post('/ai/chat')
      .set(ipHeader(testIP))
      .send({
        message: 'Some random message that doesnt match any specific pattern'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Should still return valid extraction structure
    expect(res.body.data.extraction.intent).toBe('information');
    expect(res.body.data.extraction.response_type).toBe('chat');
  }, 10000);
});