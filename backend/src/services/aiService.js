// src/services/aiService.js
import { Groq } from 'groq-sdk';
import prisma from '../utils/database.js';
import logger from '../utils/logger.js';

class AIService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.currentModel = 'openai/gpt-oss-20b';
  }

  // ===========================================================
  // LEAD AI CHAT (IP-based with LLM extraction)
  // ===========================================================

  async handleLeadConversation(message, ip) {
    try {
      logger.info(`Processing lead AI chat from IP: ${ip}`);
      
      // Find or create lead by IP
      let lead = await prisma.lead.findUnique({
        where: { ip },
        include: { 
          aiConversations: { 
            orderBy: { createdAt: 'asc' },
            take: 10
          },
          orders: {
            include: {
              package: true
            }
          }
        }
      });
      
      if (!lead) {
        logger.info(`Creating new lead for IP: ${ip}`);
        lead = await prisma.lead.create({
          data: { 
            ip,
            role: 'lead',
            status: 'NEW',
            source: 'ai_chat'
          },
          include: {
            aiConversations: true,
            orders: {
              include: {
                package: true
              }
            }
          }
        });
        logger.info(`Created lead: ${lead.id}`);
      }

      // Get conversation history
      const conversationHistory = lead.aiConversations 
        ? lead.aiConversations.map(conv => `User: ${conv.userMessage}\nAI: ${conv.aiMessage}`).join('\n')
        : '';

      // Get products for context
      const products = await this.getProductContext();

      // STEP 1: Use LLM to extract contact information and detect intent
      const extractionResult = await this.extractWithLLM(message, conversationHistory, lead);
      logger.info('LLM Extraction Result:', extractionResult);

      // STEP 2: Generate AI response with extracted context
      const response = await this.generateAIResponse(
        message, 
        conversationHistory, 
        products, 
        lead,
        extractionResult
      );

      // STEP 3: Store conversation
      await prisma.aiConversation.create({
        data: {
          leadId: lead.id,
          userMessage: message,
          aiMessage: response.message,
          meta: { 
            type: response.type,
            intent: response.intent,
            extraction: extractionResult,
            ...(response.packageIds && { packageIds: response.packageIds })
          }
        }
      });

      // STEP 4: Update lead with extracted contact information and interested events
      const updateData = {};
      
      if (extractionResult.contact_info && Object.keys(extractionResult.contact_info).length > 0) {
        updateData.name = extractionResult.contact_info.name || lead.name;
        updateData.email = extractionResult.contact_info.email || lead.email;
        updateData.phone = extractionResult.contact_info.phone || lead.phone;
      }
      
      // Add event to interested events if mentioned
      if (extractionResult.event_id) {
        const currentInterestedEvents = lead.interestedEvents || [];
        if (!currentInterestedEvents.includes(extractionResult.event_id)) {
          updateData.interestedEvents = [...currentInterestedEvents, extractionResult.event_id];
        }
      }
      
      // Add package to AI recommendations
      if (response.packageIds && response.packageIds.length > 0) {
        const currentRecommendations = lead.packageRecommendedByAi || [];
        const newRecommendations = response.packageIds.filter(
          pkgId => !currentRecommendations.includes(pkgId)
        );
        if (newRecommendations.length > 0) {
          updateData.packageRecommendedByAi = [...currentRecommendations, ...newRecommendations];
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: updateData
        });
        
        // Refresh lead data
        lead = await prisma.lead.findUnique({
          where: { id: lead.id },
          include: {
            aiConversations: true,
            orders: {
              include: {
                package: true
              }
            }
          }
        });
        
        logger.info('Lead updated with extracted info:', {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          interestedEvents: lead.interestedEvents,
          packageRecommendedByAi: lead.packageRecommendedByAi
        });
      }

      // STEP 5: Update lead score
      const leadScore = this.calculateLeadScore(lead);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { leadScore }
      });

      return {
        success: true,
        data: {
          message: response.message,
          type: response.type,
          intent: response.intent,
          packageIds: response.packageIds,
          extraction: extractionResult,
          lead: {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            leadScore
          }
        }
      };
    } catch (error) {
      logger.error('AI conversation error:', error);
      throw new Error('Failed to process AI conversation');
    }
  }

  // ===========================================================
  // ADMIN AI CHAT (with LLM content detection)
  // ===========================================================

  async handleAdminQuery(message, adminId) {
    try {
      logger.info(`Processing admin AI query from admin: ${adminId}`);
      
      // Use LLM to detect if this is content generation
      const contentDetection = await this.detectContentGenerationWithLLM(message);
      
      if (contentDetection.is_content_generation) {
        return await this.handleContentGeneration(message, contentDetection, adminId);
      }

      // Regular admin query processing
      const [leads, packages, itineraries, addons, analytics, orders] = await Promise.all([
        prisma.lead.findMany({ 
          where: { role: 'lead' },
          take: 100,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.package.findMany({
          orderBy: { createdAt: 'desc' }
        }),
        prisma.itinerary.findMany(),
        prisma.addOn.findMany(),
        prisma.analyticEvent.findMany({ 
          where: { 
            createdAt: { 
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            } 
          },
          take: 1000
        }),
        prisma.order.findMany({
          include: {
            lead: true,
            package: true
          },
          take: 50,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // Get admin conversation history
      const adminConversations = await prisma.aiConversation.findMany({
        where: { leadId: adminId },
        orderBy: { createdAt: 'asc' },
        take: 10
      });

      const conversationHistory = adminConversations.map(conv => 
        `Admin: ${conv.userMessage}\nAI: ${conv.aiMessage}`
      ).join('\n');

      // Calculate package orders count manually
      const packageOrdersCount = {};
      orders.forEach(order => {
        packageOrdersCount[order.packageId] = (packageOrdersCount[order.packageId] || 0) + 1;
      });

      // Calculate lead statistics
      const leadStats = {
        total: leads.length,
        byStatus: {},
        bySource: {}
      };
      
      leads.forEach(lead => {
        leadStats.byStatus[lead.status] = (leadStats.byStatus[lead.status] || 0) + 1;
        if (lead.source) {
          leadStats.bySource[lead.source] = (leadStats.bySource[lead.source] || 0) + 1;
        }
      });

      const prompt = `
        You are an AI assistant for the Sports Travel Platform ADMIN panel.

        Current System Stats:
        - Total Leads: ${leads.length}
        - Total Packages: ${packages.length}
        - Total Orders: ${orders.length}
        - Recent Analytics Events: ${analytics.length} (last 7 days)

        Lead Statistics:
        ${Object.entries(leadStats.byStatus).map(([status, count]) => 
          `- ${status}: ${count} leads`
        ).join('\n')}

        Lead Sources:
        ${Object.entries(leadStats.bySource).map(([source, count]) => 
          `- ${source}: ${count} leads`
        ).join('\n')}

        Recent Leads (last 10):
        ${leads.slice(0, 10).map(lead => 
          `- ${lead.name || 'Unknown'}: ${lead.email || 'No email'} | Score: ${lead.leadScore} | Status: ${lead.status}`
        ).join('\n')}

        Packages (last 10):
        ${packages.slice(0, 10).map(pkg => 
          `- ${pkg.title}: $${pkg.basePrice} at ${pkg.location || 'N/A'} (${pkg.category || 'No category'}) - ${packageOrdersCount[pkg.id] || 0} orders`
        ).join('\n')}

        Recent Orders (last 5):
        ${orders.slice(0, 5).map(order => 
          `- ${order.package.title} booked by ${order.lead.name || 'Unknown'} (${order.lead.email || 'No email'})`
        ).join('\n')}

        Conversation History:
        ${conversationHistory}

        Admin Query: "${message}"

        Your Capabilities:
        1. DATA ANALYSIS: Analyze leads, packages, orders, conversion rates
        2. CONTENT GENERATION: Create SEO titles, descriptions, itineraries, add-ons, email content
        3. LEAD MANAGEMENT: Suggest follow-up strategies, lead scoring improvements
        4. BUSINESS INSIGHTS: Provide suggestions based on data analysis
        5. PRODUCT SUGGESTIONS: Recommend package improvements, upsells, new offerings
        6. MARKETING: Suggest campaigns, content ideas, promotion strategies

        Response Guidelines:
        - Be concise but comprehensive
        - Provide actionable insights
        - Use data to support recommendations
        - Focus on business value
        - Suggest specific improvements

        If query is not related to admin functions, say "I specialize in admin tasks for our travel platform."
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.currentModel,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      });

      const aiResponse = completion.choices[0].message.content;

      // Store admin conversation
      await prisma.aiConversation.create({
        data: {
          leadId: adminId,
          userMessage: message,
          aiMessage: aiResponse,
          meta: { 
            type: 'admin_assistant',
            query_type: 'admin_query',
            stats_used: {
              leads: leads.length,
              packages: packages.length,
              orders: orders.length,
              analytics: analytics.length
            }
          }
        }
      });

      return {
        success: true,
        data: {
          response: aiResponse,
          type: 'admin_assistant',
          isContentGeneration: false,
          stats: {
            leads: leads.length,
            packages: packages.length,
            orders: orders.length
          }
        }
      };
    } catch (error) {
      logger.error('Admin AI query error:', error);
      throw new Error('Failed to process admin AI query');
    }
  }

  // ===========================================================
  // LLM UTILITIES
  // ===========================================================

  async extractWithLLM(message, history, lead) {
    const prompt = `
      Analyze the user message and extract structured information.

      USER MESSAGE: "${message}"

      CONVERSATION HISTORY:
      ${history}

      CURRENT LEAD INFO:
      - Name: ${lead.name || 'Not provided'}
      - Email: ${lead.email || 'Not provided'} 
      - Phone: ${lead.phone || 'Not provided'}
      - Interested Events: ${lead.interestedEvents?.join(', ') || 'None'}
      - AI Recommended Packages: ${lead.packageRecommendedByAi?.join(', ') || 'None'}

      EXTRACTION TASKS:

      1. CONTACT INFORMATION EXTRACTION:
      Extract any contact information from the message. Return as JSON:
      {
        "contact_info": {
          "name": "extracted full name or null",
          "email": "extracted email or null", 
          "phone": "extracted phone number (digits only) or null"
        }
      }

      2. INTENT CLASSIFICATION:
      Classify the user's intent into one of these categories:
      - "booking": User wants to book/reserve/purchase a package
      - "recommendation": User asks for suggestions/recommendations
      - "information": User asks about products/packages/services
      - "general_chat": General conversation, greetings, etc.
      - "quote": User asks for pricing/quote
      - "other": Doesn't fit other categories

      3. RESPONSE TYPE PREDICTION:
      Predict what type of response would be most appropriate:
      - "booking": For booking-related responses
      - "trip_advisor": For recommendation responses  
      - "chat": For general information and FAQ responses
      - "quote": For quote generation responses

      4. ENTITY EXTRACTION:
      Extract these entities if mentioned:
      {
        "event_id": "UUID of event mentioned or null",
        "package_id": "UUID of package mentioned or null",
        "destination": "location mentioned or null",
        "budget": "budget range mentioned or null",
        "dates": "travel dates mentioned or null",
        "sport": "sport mentioned or null"
      }

      RESPONSE FORMAT:
      Return ONLY valid JSON in this exact structure:
      {
        "contact_info": {
          "name": "string or null",
          "email": "string or null", 
          "phone": "string or null"
        },
        "intent": "booking|recommendation|information|general_chat|quote|other",
        "response_type": "booking|trip_advisor|chat|quote",
        "entities": {
          "event_id": "string or null",
          "package_id": "string or null",
          "destination": "string or null",
          "budget": "string or null",
          "dates": "string or null",
          "sport": "string or null"
        }
      }

      EXAMPLES:
      Input: "My name is John Doe, email john@test.com, phone 1234567890"
      Output: {"contact_info": {"name": "John Doe", "email": "john@test.com", "phone": "1234567890"}, "intent": "booking", "response_type": "booking", "entities": {}}

      Input: "Can you recommend football packages in Brazil?"
      Output: {"contact_info": {}, "intent": "recommendation", "response_type": "trip_advisor", "entities": {"sport": "football", "destination": "Brazil"}}

      Input: "What packages do you have for Formula 1?"
      Output: {"contact_info": {}, "intent": "information", "response_type": "chat", "entities": {"sport": "Formula 1"}}

      Input: "Hello"
      Output: {"contact_info": {}, "intent": "general_chat", "response_type": "chat", "entities": {}}
    `;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192",
        temperature: 0.3,
        max_tokens: 1024,
        stream: false,
      });

      const extractionText = completion.choices[0].message.content;
      logger.info('LLM Extraction Response:', extractionText);

      // Parse JSON response
      const extraction = JSON.parse(extractionText);
      
      // Clean up contact info
      if (extraction.contact_info) {
        Object.keys(extraction.contact_info).forEach(key => {
          if (extraction.contact_info[key] === null || extraction.contact_info[key] === 'null') {
            extraction.contact_info[key] = null;
          }
        });
      }

      return extraction;
    } catch (error) {
      logger.error('LLM extraction error:', error);
      // Fallback to basic extraction
      return {
        contact_info: {},
        intent: 'information',
        response_type: 'chat',
        entities: {}
      };
    }
  }

  async generateAIResponse(message, history, products, lead, extraction) {
    // Get events for context
    const events = await prisma.event.findMany({
      where: { isActive: true },
      take: 10
    });

    // Get lead's previous quotes for context
    const previousQuotes = await prisma.quote.findMany({
      where: { leadId: lead.id },
      take: 5,
      include: {
        package: true,
        event: true
      }
    });

    const prompt = `
      You are a Sports Travel Package assistant. Your roles:
      1. Chat bot/FAQ - Answer questions about products
      2. Trip advisor - Recommend packages based on budget, country, dates, sports  
      3. Booking assistant - Help users book packages
      4. Quote generator - Help generate quotes for packages

      USER CONTEXT:
      - Current lead: ${lead.name || 'Unknown'} (${lead.email || 'No email'})
      - Phone: ${lead.phone || 'Not provided'}
      - Previous packages recommended: ${lead.packageRecommendedByAi?.join(', ') || 'None'}
      - Interested Events: ${lead.interestedEvents?.join(', ') || 'None'}
      - Previous quotes: ${previousQuotes.length} quotes
      - Previous orders: ${lead.orders?.map(o => o.package.title).join(', ') || 'None'}

      EXTRACTION ANALYSIS:
      - Detected Intent: ${extraction.intent}
      - Contact Info Provided: ${JSON.stringify(extraction.contact_info)}
      - Recommended Response Type: ${extraction.response_type}
      - Entities Extracted: ${JSON.stringify(extraction.entities)}

      CONVERSATION HISTORY:
      ${history}

      AVAILABLE EVENTS:
      ${events.map(event => `
        Event: ${event.title}
        Location: ${event.location}
        Dates: ${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}
        Category: ${event.category || 'General'}
        Description: ${event.description?.substring(0, 100) || 'No description'}...
      `).join('\n')}

      AVAILABLE PACKAGES:
      ${products.slice(0, 15).map(p => `
        Package: ${p.title}
        Price: $${p.basePrice} ${p.dynamicPrice ? `(Dynamic: $${p.dynamicPrice})` : ''}
        Location: ${p.location || 'N/A'}
        Category: ${p.category || 'General'}
        Description: ${p.description?.substring(0, 80) || 'No description'}...
        Event: ${events.find(e => e.id === p.eventId)?.title || 'Unknown'}
      `).join('\n')}

      CURRENT USER MESSAGE: "${message}"

      RESPONSE GUIDELINES BASED ON EXTRACTED INTENT:

      ${extraction.intent === 'booking' ? `
      BOOKING INTENT DETECTED:
      - If contact info is complete (name, email, phone): Confirm booking and next steps
      - If contact info is incomplete: Politely ask for missing information
      - If package is mentioned: Confirm package details and ask for travel dates
      - Always maintain friendly, helpful tone
      ` : ''}

      ${extraction.intent === 'recommendation' ? `
      RECOMMENDATION INTENT DETECTED:
      - Ask for criteria: budget, destination, dates, sports preferences
      - If criteria provided: Suggest 2-3 matching packages with brief descriptions
      - If no matches: Suggest adjusting criteria
      - Mention that you can generate quotes for recommended packages
      ` : ''}

      ${extraction.intent === 'information' ? `
      INFORMATION INTENT DETECTED:
      - Provide clear, helpful information about packages
      - Highlight key features and benefits
      - Offer to provide more specific details if needed
      - Mention that you can recommend packages or generate quotes
      ` : ''}

      ${extraction.intent === 'quote' ? `
      QUOTE INTENT DETECTED:
      - Ask for package selection if not mentioned
      - Ask for travel dates and number of travelers
      - Mention that quotes include seasonal adjustments, discounts, etc.
      - Offer to generate a detailed quote
      ` : ''}

      GENERAL RULES:
      - Always maintain conversation context from history
      - For non-product questions: "I don't have knowledge about that"
      - Respond in friendly, conversational tone
      - Use the contact info provided to personalize responses
      - Keep responses concise but informative
      - End with a question to keep conversation flowing

      Respond naturally and helpfully.
    `;

    const completion = await this.groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: this.currentModel,
      temperature: 0.8,
      max_tokens: 1024,
      stream: false,
    });

    const aiResponse = completion.choices[0].message.content;

    // Determine if packages should be recommended based on intent and entities
    let packageIds = [];
    if (extraction.intent === 'recommendation' || extraction.intent === 'booking') {
      if (extraction.entities.package_id) {
        packageIds = [extraction.entities.package_id];
      } else if (extraction.entities.destination || extraction.entities.sport) {
        // Find matching packages
        const matchingPackages = products.filter(pkg => {
          if (extraction.entities.destination && 
              pkg.location?.toLowerCase().includes(extraction.entities.destination.toLowerCase())) {
            return true;
          }
          if (extraction.entities.sport && 
              pkg.category?.toLowerCase().includes(extraction.entities.sport.toLowerCase())) {
            return true;
          }
          return false;
        }).slice(0, 3);
        
        packageIds = matchingPackages.map(p => p.id);
      }
    }

    return {
      message: aiResponse,
      type: extraction.response_type,
      intent: extraction.intent,
      packageIds,
      updateLead: extraction.contact_info
    };
  }

  async detectContentGenerationWithLLM(message) {
    const prompt = `
      Analyze if this admin query is requesting content generation.

      QUERY: "${message}"

      CONTENT GENERATION TYPES:
      - "seo_title": Requests for SEO titles, meta titles, page titles
      - "description": Requests for product/package descriptions
      - "itinerary": Requests for travel itineraries, schedules, plans
      - "addon": Requests for add-ons, upsells, additional services  
      - "email": Requests for email content, campaigns, promotions
      - "blog": Requests for blog articles, content
      - "social": Requests for social media content
      - "none": Not a content generation request

      RESPONSE FORMAT:
      Return ONLY valid JSON:
      {
        "is_content_generation": true/false,
        "content_type": "seo_title|description|itinerary|addon|email|blog|social|none",
        "subject": "extracted subject for content generation or null"
      }

      EXAMPLES:
      Input: "Create SEO titles for Olympic packages"
      Output: {"is_content_generation": true, "content_type": "seo_title", "subject": "Olympic packages"}

      Input: "Write a description for World Cup packages"
      Output: {"is_content_generation": true, "content_type": "description", "subject": "World Cup packages"}

      Input: "Create a 5-day itinerary for F1 Monaco"
      Output: {"is_content_generation": true, "content_type": "itinerary", "subject": "F1 Monaco"}

      Input: "Analyze our leads"
      Output: {"is_content_generation": false, "content_type": "none", "subject": null}
    `;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192",
        temperature: 0.3,
        max_tokens: 512,
        stream: false,
      });

      const detectionText = completion.choices[0].message.content;
      return JSON.parse(detectionText);
    } catch (error) {
      logger.error('Content generation detection error:', error);
      return {
        is_content_generation: false,
        content_type: "none",
        subject: null
      };
    }
  }

  async handleContentGeneration(message, contentDetection, adminId) {
    try {
      const prompt = this.getContentGenerationPrompt(contentDetection.content_type, contentDetection.subject);

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.currentModel,
        temperature: 0.8,
        max_tokens: 2048,
        stream: false,
      });

      const generatedContent = completion.choices[0].message.content;

      // Store the conversation
      await prisma.aiConversation.create({
        data: {
          leadId: adminId,
          userMessage: message,
          aiMessage: generatedContent,
          meta: { 
            type: 'content_generation',
            content_type: contentDetection.content_type,
            subject: contentDetection.subject
          }
        }
      });

      return {
        success: true,
        data: {
          response: generatedContent,
          type: 'content_generation',
          content_type: contentDetection.content_type,
          subject: contentDetection.subject,
          isContentGeneration: true
        }
      };
    } catch (error) {
      logger.error('Content generation error:', error);
      throw new Error('Failed to generate content');
    }
  }

  getContentGenerationPrompt(type, subject) {
    const prompts = {
      seo_title: `Create 5 engaging SEO-optimized titles for sports travel package: "${subject || 'sports travel package'}". 
        Requirements:
        - Under 60 characters each
        - Include location and key benefits
        - Compelling for sports travelers
        - Include primary keywords
        - Format as numbered list with brief explanation for each
        - Focus on action words and emotional triggers`,

      description: `Write a compelling marketing description for sports travel package: "${subject || 'sports travel package'}".
        Structure:
        1. Engaging opening hook (1-2 sentences)
        2. Key highlights and unique experiences (3-4 bullet points)
        3. Target audience appeal (who is this perfect for?)
        4. What's included and excluded
        5. Strong call-to-action
        6. Emotional appeal for sports enthusiasts
        Make it persuasive, exciting, and conversion-focused!`,

      itinerary: `Create a detailed day-by-day itinerary for sports travel package: "${subject || 'sports travel package'}".
        Include for each day:
        - Morning activities with times
        - Afternoon activities with times
        - Evening activities with times
        - Sports events and training sessions
        - Meals and accommodations details
        - Transportation details
        - Unique local experiences
        - Free time suggestions
        Make it exciting, well-structured, and appealing to sports travelers!`,

      addon: `Suggest 5 attractive add-ons and upgrades for sports travel package: "${subject || 'sports travel package'}".
        For each add-on include:
        - Name (creative and appealing)
        - Brief description (2-3 sentences)
        - Price range suggestion (realistic)
        - Target audience (who would love this?)
        - Value proposition (why it's worth it)
        - Perfect pairing (which packages it goes best with)
        Focus on premium experiences that sports travelers would appreciate!`,

      email: `Write a complete promotional email for sports travel package: "${subject || 'sports travel package'}".
        Include:
        - Compelling subject line (under 50 characters)
        - Engaging preheader text (under 100 characters)
        - Personalized greeting
        - Problem/solution framing
        - Key benefits and highlights (bullet points)
        - Social proof/testimonial space
        - Strong call-to-action button text
        - Secondary call-to-action
        - Professional closing with contact info
        - PS with extra incentive
        Make it exciting, personalized, and conversion-focused!`,

      blog: `Write a blog article about sports travel package: "${subject || 'sports travel package'}".
        Structure:
        - Engaging headline
        - Introduction with hook
        - 3-4 main sections with subheadings
        - Personal stories or testimonials
        - Practical tips and advice
        - FAQ section
        - Conclusion with call-to-action
        - Suggested images and captions
        Make it informative, engaging, and SEO-optimized!`,

      social: `Create social media content for sports travel package: "${subject || 'sports travel package'}".
        Include:
        - 5 Instagram captions with hashtags
        - 3 Twitter/X posts
        - 2 Facebook posts
        - 1 LinkedIn post
        - Suggested images/videos for each
        - Engagement questions
        Make it shareable, engaging, and platform-appropriate!`
    };

    return prompts[type] || `Generate compelling content for sports travel package: "${subject}". Focus on engaging sports travelers and highlighting unique experiences.`;
  }

  // ===========================================================
  // HELPER METHODS
  // ===========================================================

  async getProductContext() {
    return await prisma.package.findMany({
      where: {
        OR: [
          { eventDate: { gte: new Date() } },
          { eventDate: null }
        ]
      },
      include: {
        event: true
      },
      take: 50
    });
  }

  calculateLeadScore(lead) {
    let score = 0;
    
    // Contact information
    if (lead.name) score += 10;
    if (lead.email) score += 20;
    if (lead.phone) score += 15;
    
    // Engagement
    if (lead.aiConversations?.length > 0) {
      score += Math.min(lead.aiConversations.length * 2, 20);
    }
    
    if (lead.interestedEvents?.length > 0) {
      score += lead.interestedEvents.length * 5;
    }
    
    if (lead.packageRecommendedByAi?.length > 0) {
      score += lead.packageRecommendedByAi.length * 5;
    }
    
    // Business info
    if (lead.company) score += 10;
    if (lead.position) score += 5;
    
    // Recent activity
    const daysSinceCreation = Math.floor(
      (new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreation <= 7) {
      score += 15;
    } else if (daysSinceCreation <= 30) {
      score += 10;
    }
    
    // Quotes and orders
    if (lead.quotes?.length > 0) {
      score += Math.min(lead.quotes.length * 10, 30);
    }
    
    if (lead.orders?.length > 0) {
      score += Math.min(lead.orders.length * 15, 45);
    }
    
    return Math.min(score, 100);
  }

  // ===========================================================
  // CHAT HISTORY METHODS
  // ===========================================================

  async getLeadChatHistoryByIp(ip) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { ip },
        include: {
          aiConversations: {
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      });

      if (!lead) {
        return {
          success: false,
          error: 'No lead found with this IP address'
        };
      }

      return {
        success: true,
        data: {
          lead: {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            ip: lead.ip,
            leadScore: lead.leadScore,
            status: lead.status,
            createdAt: lead.createdAt
          },
          conversations: lead.aiConversations,
          totalConversations: lead.aiConversations.length
        }
      };
    } catch (error) {
      logger.error('Get lead chat history by IP error:', error);
      throw new Error('Failed to fetch chat history');
    }
  }

  async getLeadChatHistoryByLeadId(leadId) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          aiConversations: {
            orderBy: { createdAt: 'desc' },
            take: 100
          },
          quotes: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              package: true,
              event: true
            }
          },
          orders: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              package: true
            }
          }
        }
      });

      if (!lead) {
        return {
          success: false,
          error: 'Lead not found'
        };
      }

      // Group conversations by day for easier viewing
      const groupedByDay = {};
      lead.aiConversations.forEach(conv => {
        const day = conv.createdAt.toISOString().split('T')[0];
        if (!groupedByDay[day]) {
          groupedByDay[day] = [];
        }
        groupedByDay[day].push(conv);
      });

      return {
        success: true,
        data: {
          lead: {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            ip: lead.ip,
            leadScore: lead.leadScore,
            status: lead.status,
            interestedEvents: lead.interestedEvents,
            packageRecommendedByAi: lead.packageRecommendedByAi,
            source: lead.source,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt
          },
          conversations: lead.aiConversations,
          groupedByDay,
          quotes: lead.quotes,
          orders: lead.orders,
          stats: {
            totalConversations: lead.aiConversations.length,
            totalQuotes: lead.quotes.length,
            totalOrders: lead.orders.length,
            totalDays: Object.keys(groupedByDay).length
          }
        }
      };
    } catch (error) {
      logger.error('Get lead chat history by ID error:', error);
      throw new Error('Failed to fetch chat history');
    }
  }
}

export default new AIService();