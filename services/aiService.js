const { Groq } = require('groq-sdk');
const prisma = require('../utils/database');

class AIService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.currentModel = 'openai/gpt-oss-20b';

}

  // Public AI for leads
  async handleLeadConversation(message, ip) {
    try {
      // Find or create lead by IP
      console.log('Looking for lead with IP:', ip);
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
      
      console.log('Found lead:', lead ? lead.id : 'null');
      
      if (!lead) {
        console.log('Creating new lead with IP:', ip);
        lead = await prisma.lead.create({
          data: { 
            ip,
            role: 'lead',
            status: 'NEW'
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
        console.log('Created lead:', lead.id);
      }

      const conversationHistory = lead.aiConversations 
        ? lead.aiConversations.map(conv => `User: ${conv.userMessage}\nAI: ${conv.aiMessage}`).join('\n')
        : '';

      // Get products for context
      const products = await this.getProductContext();

      // STEP 1: Use LLM to extract contact information and detect intent
      const extractionResult = await this.extractWithLLM(message, conversationHistory, lead);
      console.log('🎯 LLM Extraction Result:', extractionResult);

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

      // STEP 4: Update lead with extracted contact information
      if (extractionResult.contact_info && Object.keys(extractionResult.contact_info).length > 0) {
        console.log('🔄 Updating lead with LLM-extracted contact info:', extractionResult.contact_info);
        await prisma.lead.update({
          where: { id: lead.id },
          data: extractionResult.contact_info
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
        console.log('✅ Lead after LLM update:', {
          name: lead.name,
          email: lead.email,
          phone: lead.phone
        });
      }

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
            phone: lead.phone
          }
        }
      };
    } catch (error) {
      console.error('❌ AI conversation error:', error);
      throw new Error('Failed to process AI conversation');
    }
  }

  // LLM-based extraction for contact info and intent detection
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
      - "other": Doesn't fit other categories

      3. RESPONSE TYPE PREDICTION:
      Predict what type of response would be most appropriate:
      - "booking": For booking-related responses
      - "trip_advisor": For recommendation responses  
      - "chat": For general information and FAQ responses

      RESPONSE FORMAT:
      Return ONLY valid JSON in this exact structure:
      {
        "contact_info": {
          "name": "string or null",
          "email": "string or null", 
          "phone": "string or null"
        },
        "intent": "booking|recommendation|information|general_chat|other",
        "response_type": "booking|trip_advisor|chat"
      }

      EXAMPLES:
      Input: "My name is John Doe, email john@test.com, phone 1234567890"
      Output: {"contact_info": {"name": "John Doe", "email": "john@test.com", "phone": "1234567890"}, "intent": "booking", "response_type": "booking"}

      Input: "Can you recommend football packages?"
      Output: {"contact_info": {}, "intent": "recommendation", "response_type": "trip_advisor"}

      Input: "What packages do you have?"
      Output: {"contact_info": {}, "intent": "information", "response_type": "chat"}

      Input: "Hello"
      Output: {"contact_info": {}, "intent": "general_chat", "response_type": "chat"}
    `;

    try {
      const completion = await this.groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: this.currentModel,
  temperature: 1,
  max_tokens: 8192,
  top_p: 1,
  // reasoning_effort: "medium", // Remove this if it causes errors
  stream: false, // Set to false for non-streaming
});

      const extractionText = completion.choices[0].message.content;
      console.log('🤖 LLM Extraction Response:', extractionText);

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
      console.error('❌ LLM extraction error:', error);
      // Fallback to basic extraction
      return {
        contact_info: {},
        intent: 'information',
        response_type: 'chat'
      };
    }
  }

  // Enhanced AI response generation using extraction results
  async generateAIResponse(message, history, products, lead, extraction) {
    const prompt = `
      You are a Sports Travel Package assistant. Your roles:
      1. Chat bot/FAQ - Answer questions about products
      2. Trip advisor - Recommend packages based on budget, country, dates, sports  
      3. Booking assistant - Help users book packages

      USER CONTEXT:
      - Current lead: ${lead.name || 'Unknown'} (${lead.email || 'No email'})
      - Previous packages recommended: ${lead.packageRecommendedByAi?.join(', ') || 'None'}
      - Previous orders: ${lead.orders?.map(o => o.package.title).join(', ') || 'None'}

      EXTRACTION ANALYSIS:
      - Detected Intent: ${extraction.intent}
      - Contact Info Provided: ${JSON.stringify(extraction.contact_info)}
      - Recommended Response Type: ${extraction.response_type}

      CONVERSATION HISTORY:
      ${history}

      AVAILABLE PRODUCTS:
      ${products.map(p => `
        Package: ${p.title}
        Price: ${p.basePrice} - ${p.dynamicPrice || p.basePrice}
        Location: ${p.location}
        Category: ${p.category || 'General'}
        Description: ${p.description || 'No description'}
        Event Date: ${p.eventDate || 'Flexible'}
      `).join('\n')}

      CURRENT USER MESSAGE: ${message}

      RESPONSE GUIDELINES BASED ON EXTRACTED INTENT:

      ${extraction.intent === 'booking' ? `
      BOOKING INTENT DETECTED:
      - If contact info is complete (name, email, phone): Confirm booking and next steps
      - If contact info is incomplete: Politely ask for missing information
      - Always maintain friendly, helpful tone
      ` : ''}

      ${extraction.intent === 'recommendation' ? `
      RECOMMENDATION INTENT DETECTED:
      - Ask for criteria: budget, destination, dates, sports preferences
      - If criteria provided: Suggest 2-3 matching packages
      - If no matches: Suggest adjusting criteria
      ` : ''}

      ${extraction.intent === 'information' ? `
      INFORMATION INTENT DETECTED:
      - Provide clear, helpful information about packages
      - Highlight key features and benefits
      - Offer to provide more specific details if needed
      ` : ''}

      GENERAL RULES:
      - Always maintain conversation context from history
      - For non-product questions: "I don't have knowledge about that"
      - Respond in friendly, conversational tone
      - Use the contact info provided to personalize responses

      Respond naturally and helpfully.
    `;

    const completion = await this.groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: this.currentModel,
  temperature: 1,
  max_tokens: 8192,
  top_p: 1,
  stream: false,
});

    const aiResponse = completion.choices[0].message.content;

    // Use LLM-extracted response type
    return {
      message: aiResponse,
      type: extraction.response_type,
      intent: extraction.intent,
      packageIds: [],
      updateLead: extraction.contact_info // Use LLM-extracted contact info for updates
    };
  }

  // Single Admin AI endpoint that handles everything
  async handleAdminQuery(message, adminId) {
    try {
      // Use LLM to detect if this is content generation
      const contentDetection = await this.detectContentGenerationWithLLM(message);
      
      if (contentDetection.is_content_generation) {
        return await this.handleContentGeneration(message, contentDetection, adminId);
      }

      // Regular admin query processing (same as before)
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

      const prompt = `
        You are an AI assistant for the Sports Travel Platform ADMIN panel.

        Available Data:
        - Total Leads: ${leads.length}
        - Total Packages: ${packages.length}
        - Total Orders: ${orders.length}
        - Recent Analytics: ${analytics.length} events in last 7 days

        Lead Summary (last 10):
        ${leads.slice(0, 10).map(lead => 
          `- ${lead.name || 'Unknown'}: ${lead.email || 'No email'} | Score: ${lead.leadScore} | Status: ${lead.status}`
        ).join('\n')}

        Packages:
        ${packages.map(pkg => 
          `- ${pkg.title}: ₹${pkg.basePrice} at ${pkg.location} (${pkg.category || 'No category'}) - ${packageOrdersCount[pkg.id] || 0} orders`
        ).join('\n')}

        Recent Orders (last 5):
        ${orders.slice(0, 5).map(order => 
          `- ${order.package.title} booked by ${order.lead.name || 'Unknown'} (${order.lead.email || 'No email'})`
        ).join('\n')}

        Conversation History:
        ${conversationHistory}

        Admin Query: ${message}

        Your Capabilities:
        1. CONTENT GENERATION: Create SEO titles, descriptions, itineraries, add-ons, email content
        2. LEAD ANALYSIS: Summarize leads, suggest improvements, analyze trends
        3. BUSINESS INSIGHTS: Provide suggestions based on data analysis
        4. PRODUCT SUGGESTIONS: Recommend package improvements, upsells, new offerings
        5. ANALYTICS INTERPRETATION: Explain analytics data and suggest actions
        6. WRITING ASSISTANCE: Help write marketing content, emails, descriptions

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
  temperature: 1,
  max_tokens: 8192,
  top_p: 1,
  stream: false,
});

      const aiResponse = completion.choices[0].message.content;

      // Store admin conversation
      await prisma.aiConversation.create({
        data: {
          leadId: adminId,
          userMessage: message,
          aiMessage: aiResponse,
          meta: { type: 'admin_assistant' }
        }
      });

      return {
        success: true,
        data: {
          response: aiResponse,
          type: 'admin_assistant',
          isContentGeneration: false
        }
      };
    } catch (error) {
      console.error('❌ Admin AI query error:', error);
      throw new Error('Failed to process admin AI query');
    }
  }

  // LLM-based content generation detection
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
      - "none": Not a content generation request

      RESPONSE FORMAT:
      Return ONLY valid JSON:
      {
        "is_content_generation": true/false,
        "content_type": "seo_title|description|itinerary|addon|email|none",
        "subject": "extracted subject for content generation or null"
      }

      EXAMPLES:
      Input: "Create SEO titles for Olympic packages"
      Output: {"is_content_generation": true, "content_type": "seo_title", "subject": "Olympic packages"}

      Input: "Write a description for World Cup packages"
      Output: {"is_content_generation": true, "content_type": "description", "subject": "World Cup packages"}

      Input: "Analyze our leads"
      Output: {"is_content_generation": false, "content_type": "none", "subject": null}
    `;

    try {
      const completion = await this.groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: this.currentModel,
  temperature: 1,
  max_tokens: 8192,
  top_p: 1,
  stream: false,
});

      const detectionText = completion.choices[0].message.content;
      return JSON.parse(detectionText);
    } catch (error) {
      console.error('❌ Content generation detection error:', error);
      return {
        is_content_generation: false,
        content_type: "none",
        subject: null
      };
    }
  }

  // Enhanced content generation with LLM
  async handleContentGeneration(message, contentDetection, adminId) {
    try {
      const prompt = this.getContentGenerationPrompt(contentDetection.content_type, contentDetection.subject);

      const completion = await this.groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: this.currentModel,
  temperature: 1,
  max_tokens: 8192,
  top_p: 1,
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
      console.error('❌ Content generation error:', error);
      throw new Error('Failed to generate content');
    }
  }

  getContentGenerationPrompt(type, subject) {
    const prompts = {
      seo_title: `Create 3 engaging SEO-optimized titles for sports travel package: "${subject}". 
        Requirements:
        - Under 60 characters each
        - Include location and key benefits
        - Compelling for sports travelers
        - Include primary keywords
        - Format as numbered list with brief explanation for each`,

      description: `Write a compelling marketing description for sports travel package: "${subject}".
        Structure:
        1. Engaging opening hook
        2. Key highlights and unique experiences  
        3. Target audience appeal
        4. Strong call-to-action
        5. Emotional appeal for sports enthusiasts
        Make it persuasive and exciting!`,

      itinerary: `Create a detailed day-by-day itinerary for sports travel package: "${subject}".
        Include for each day:
        - Morning, afternoon, evening activities
        - Sports events and training sessions
        - Meals and accommodations
        - Transportation details
        - Unique local experiences
        Make it exciting and well-structured for sports travelers!`,

      addon: `Suggest 5 attractive add-ons and upgrades for sports travel package: "${subject}".
        For each add-on include:
        - Name and brief description
        - Price range suggestion
        - Target audience
        - Value proposition
        Focus on premium experiences that sports travelers would appreciate!`,

      email: `Write a complete promotional email for sports travel package: "${subject}".
        Include:
        - Compelling subject line (under 50 characters)
        - Engaging preheader text
        - Personalized greeting
        - Key benefits and highlights
        - Strong call-to-action button
        - Professional closing
        Make it exciting and conversion-focused!`
    };

    return prompts[type] || `Generate compelling content for sports travel package: "${subject}". Focus on engaging sports travelers and highlighting unique experiences.`;
  }

  // FIXED: Remove invalid relations
  async getProductContext() {
    return await prisma.package.findMany({
      where: {
        OR: [
          { eventDate: { gte: new Date() } },
          { eventDate: null }
        ]
      }
    });
  }
}

module.exports = new AIService();