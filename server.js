require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./middleware/auth');
const prisma = require('./utils/database');
const aiService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Get client IP middleware
// Get client IP middleware
app.use((req, res, next) => {
  // Get IP from various headers (for testing and production)
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (forwarded) {
    // Handle multiple IPs in X-Forwarded-For
    req.clientIp = forwarded.split(',')[0].trim();
  } else if (realIp) {
    req.clientIp = realIp;
  } else {
    req.clientIp = req.ip || req.connection.remoteAddress;
  }
  
  // Clean up IPv6 format if present
  if (req.clientIp && req.clientIp.includes('::ffff:')) {
    req.clientIp = req.clientIp.replace('::ffff:', '');
  }
  
  console.log('📡 IP Detection:', {
    originalIp: req.ip,
    forwarded: req.headers['x-forwarded-for'],
    realIp: req.headers['x-real-ip'],
    finalIp: req.clientIp
  });
  
  next();
});

// ==================== HEALTH & TEST ROUTES ====================

app.get('/health', (req, res) => {
  res.json({ 
    message: '✅ Server is running!', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/test-db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ message: '✅ Database connection successful' });
  } catch (error) {
    res.status(500).json({ error: '❌ Database connection failed: ' + error.message });
  }
});

// ==================== AUTH ROUTES ====================

// Create admin (run this first)
app.post('/auth/create-admin', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.lead.create({
      data: {
        email: 'admin@sports.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        ip: '127.0.0.1'
      }
    });

    res.json({ 
      message: '✅ Admin created successfully', 
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Admin already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  }
});

// Admin login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await prisma.lead.findFirst({
      where: { email, role: 'admin' }
    });

    if (!admin || !admin.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      access_token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== LEADS ROUTES ====================

// Create or update lead (public)
app.post('/leads', async (req, res) => {
  try {
    const { name, email, phone, message, packageRecommendedByAi, leadScore, status } = req.body;
    const clientIp = req.clientIp;

    console.log('Creating/updating lead with IP:', clientIp);

    // Find existing lead by IP or email
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { ip: clientIp },
          { email: email || '' }
        ]
      }
    });

    let lead;
    const leadData = {
      name: name || existingLead?.name,
      email: email || existingLead?.email,
      phone: phone || existingLead?.phone,
      message: message || existingLead?.message,
      packageRecommendedByAi: packageRecommendedByAi || existingLead?.packageRecommendedByAi || [],
      leadScore: leadScore || existingLead?.leadScore || 0,
      status: status || existingLead?.status || 'NEW'
    };

    if (existingLead) {
      // Update existing lead
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: leadData
      });
      console.log('✅ Updated existing lead:', lead.id);
    } else {
      // Create new lead
      lead = await prisma.lead.create({
        data: {
          ...leadData,
          ip: clientIp,
          role: 'lead'
        }
      });
      console.log('✅ Created new lead:', lead.id);
    }

    res.json({
      success: true,
      data: lead,
      message: existingLead ? 'Lead updated' : 'Lead created'
    });
  } catch (error) {
    console.error('❌ Create lead error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get all leads with filters (admin only)
app.get('/leads', authenticateToken, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    const where = { role: 'lead' };
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          orders: {
            include: {
              package: true
            }
          },
          aiConversations: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead status (admin only)
app.put('/leads/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['NEW', 'CONTACTED', 'CONVERTED', 'FOLLOW_UP', 'NOT_INTERESTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      data: lead,
      message: 'Lead status updated successfully'
    });
  } catch (error) {
    console.error('❌ Update lead status error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export leads to CSV (admin only)
app.get('/leads/export', authenticateToken, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    const where = { role: 'lead' };
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        orders: {
          include: {
            package: true
          }
        }
      }
    });

    // Convert to CSV format
    const csvHeaders = 'ID,Name,Email,Phone,Status,Lead Score,Packages,Created At\n';
    const csvRows = leads.map(lead => 
      `"${lead.id}","${lead.name || ''}","${lead.email || ''}","${lead.phone || ''}","${lead.status}",${lead.leadScore},"${lead.packageRecommendedByAi.join(', ')}","${lead.createdAt.toISOString()}"`
    ).join('\n');

    const csv = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('❌ Export leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PACKAGES ROUTES ====================

// Get all packages (public)
app.get('/packages', async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: packages,
      count: packages.length
    });
  } catch (error) {
    console.error('❌ Get packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured packages (public)
app.get('/packages/featured', async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      where: { isFeatured: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: packages,
      count: packages.length
    });
  } catch (error) {
    console.error('❌ Get featured packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create package (admin only)
app.post('/packages', authenticateToken, async (req, res) => {
  try {
    const packageData = await prisma.package.create({
      data: req.body
    });

    res.json({
      success: true,
      data: packageData,
      message: 'Package created successfully'
    });
  } catch (error) {
    console.error('❌ Create package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update package (admin only)
app.put('/packages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const packageData = await prisma.package.update({
      where: { id },
      data: req.body
    });

    res.json({
      success: true,
      data: packageData,
      message: 'Package updated successfully'
    });
  } catch (error) {
    console.error('❌ Update package error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete package (admin only)
app.delete('/packages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.package.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete package error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ITINERARIES ROUTES ====================

// Get all itineraries (public)
app.get('/itineraries', async (req, res) => {
  try {
    const itineraries = await prisma.itinerary.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: itineraries,
      count: itineraries.length
    });
  } catch (error) {
    console.error('❌ Get itineraries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create itinerary (admin only)
app.post('/itineraries', authenticateToken, async (req, res) => {
  try {
    const itinerary = await prisma.itinerary.create({
      data: req.body
    });

    res.json({
      success: true,
      data: itinerary,
      message: 'Itinerary created successfully'
    });
  } catch (error) {
    console.error('❌ Create itinerary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update itinerary (admin only)
app.put('/itineraries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const itinerary = await prisma.itinerary.update({
      where: { id },
      data: req.body
    });

    res.json({
      success: true,
      data: itinerary,
      message: 'Itinerary updated successfully'
    });
  } catch (error) {
    console.error('❌ Update itinerary error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Itinerary not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete itinerary (admin only)
app.delete('/itineraries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.itinerary.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Itinerary deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete itinerary error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Itinerary not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADDONS ROUTES ====================

// Get all addons (public)
app.get('/addons', async (req, res) => {
  try {
    const addons = await prisma.addOn.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: addons,
      count: addons.length
    });
  } catch (error) {
    console.error('❌ Get addons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create addon (admin only)
app.post('/addons', authenticateToken, async (req, res) => {
  try {
    const addon = await prisma.addOn.create({
      data: req.body
    });

    res.json({
      success: true,
      data: addon,
      message: 'Addon created successfully'
    });
  } catch (error) {
    console.error('❌ Create addon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update addon (admin only)
app.put('/addons/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const addon = await prisma.addOn.update({
      where: { id },
      data: req.body
    });

    res.json({
      success: true,
      data: addon,
      message: 'Addon updated successfully'
    });
  } catch (error) {
    console.error('❌ Update addon error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Addon not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete addon (admin only)
app.delete('/addons/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.addOn.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Addon deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete addon error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Addon not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ORDERS ROUTES ====================

// Create order (public)
app.post('/orders', async (req, res) => {
  try {
    const { leadId, packageId, status, meta } = req.body;

    const order = await prisma.order.create({
      data: {
        leadId,
        packageId,
        status: status || 'BOOKED',
        meta
      },
      include: {
        lead: true,
        package: true
      }
    });

    res.json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders (admin only)
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        lead: true,
        package: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AI CONVERSATIONS ROUTES ====================

// Store AI conversation for lead (public)
app.post('/leads/:id/conversations', async (req, res) => {
  try {
    const { id } = req.params;
    const { userMessage, aiMessage, meta } = req.body;

    const conversation = await prisma.aiConversation.create({
      data: {
        leadId: id,
        userMessage,
        aiMessage,
        meta
      }
    });

    res.json({
      success: true,
      data: conversation,
      message: 'Conversation stored successfully'
    });
  } catch (error) {
    console.error('❌ Store conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI conversations for lead (admin only)
app.get('/leads/:id/conversations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const conversations = await prisma.aiConversation.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ANALYTICS ROUTES ====================

// Track analytics event (public)
app.post('/analytics/events', async (req, res) => {
  try {
    const { type, page, section, element, userAgent, metadata, leadId, packageId, itineraryId } = req.body;
    const clientIp = req.clientIp;

    const event = await prisma.analyticEvent.create({
      data: {
        type,
        page,
        section,
        element,
        ip: clientIp,
        userAgent,
        metadata,
        leadId,
        packageId,
        itineraryId
      }
    });

    res.json({
      success: true,
      data: event,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('❌ Track analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics summary (admin only)
app.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get total leads
    const totalLeads = await prisma.lead.count({
      where: { 
        role: 'lead',
        createdAt: { gte: startDate }
      }
    });

    // Get leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: { 
        role: 'lead',
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    // Get total orders
    const totalOrders = await prisma.order.count({
      where: { createdAt: { gte: startDate } }
    });

    // Get package views (from analytics)
    const packageViews = await prisma.analyticEvent.count({
      where: {
        type: 'PACKAGE_VIEW',
        createdAt: { gte: startDate }
      }
    });

    // Get CTA clicks
    const ctaClicks = await prisma.analyticEvent.count({
      where: {
        type: 'CTA_CLICK',
        createdAt: { gte: startDate }
      }
    });

    // Get conversion rate (leads / total visitors approximation)
const totalVisitorsResult = await prisma.analyticEvent.groupBy({
  by: ['ip'],
  where: {
    type: 'PAGE_VIEW',
    createdAt: { gte: startDate }
  }
});
const totalVisitors = totalVisitorsResult.length;

    const conversionRate = totalVisitors > 0 ? (totalLeads / totalVisitors) * 100 : 0;

    // Get last 7 days trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayLeads = await prisma.lead.count({
        where: {
          role: 'lead',
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      last7Days.push({
        date: date.toISOString().split('T')[0],
        leads: dayLeads
      });
    }

    res.json({
      success: true,
      data: {
        totalLeads,
        leadsByStatus,
        totalOrders,
        packageViews,
        ctaClicks,
        conversionRate: Math.round(conversionRate * 100) / 100,
        last7Days
      }
    });
  } catch (error) {
    console.error('❌ Get analytics summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get popular packages (admin only)
app.get('/analytics/popular-packages', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const popularPackages = await prisma.analyticEvent.groupBy({
      by: ['packageId'],
      where: {
        type: 'PACKAGE_VIEW',
        createdAt: { gte: startDate },
        packageId: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    // Get package details
    const packagesWithDetails = await Promise.all(
      popularPackages.map(async (item) => {
        const pkg = await prisma.package.findUnique({
          where: { id: item.packageId }
        });
        return {
          package:pkg,
          views: item._count.id
        };
      })
    );

    res.json({
      success: true,
      data: packagesWithDetails
    });
  } catch (error) {
    console.error('❌ Get popular packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AI ROUTES ====================


// Public AI Chat (for leads) - uses LLM extraction
app.post('/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const clientIp = req.clientIp;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await aiService.handleLeadConversation(message, clientIp);
    res.json(result);
  } catch (error) {
    console.error('❌ AI chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process AI conversation',
      details: error.message 
    });
  }
});

// Admin AI Chat - uses LLM content detection
app.post('/ai/admin/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const adminId = req.user.id;
    const result = await aiService.handleAdminQuery(message, adminId);
    res.json(result);
  } catch (error) {
    console.error('❌ Admin AI chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process admin AI query',
      details: error.message 
    });
  }
});

// ==================== START SERVER ====================
if (process.env.NODE_ENV !== "test") {
app.listen(PORT, () => {
  console.log('\n🚀 =================================');
  console.log('   SPORTS TRAVEL API SERVER');
  console.log('   =================================');
  console.log(`   📍 Port: ${PORT}`);
  console.log(`   🌐 URL: http://localhost:${PORT}`);
  console.log('   =================================\n');
  console.log('   ✅ Endpoints:');
  console.log(`   GET  /health`);
  console.log(`   GET  /test-db`);
  console.log(`   POST /auth/create-admin`);
  console.log(`   POST /auth/login`);
  console.log(`   POST /leads`);
  console.log(`   GET  /leads (admin)`);
  console.log(`   PUT  /leads/:id/status (admin)`);
  console.log(`   GET  /leads/export (admin)`);
  console.log(`   CRUD /packages, /itineraries, /addons`);
  console.log(`   POST /analytics/events`);
  console.log(`   GET  /analytics/summary (admin)`);
  console.log('   =================================\n');
});
}
module.exports = app;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
});