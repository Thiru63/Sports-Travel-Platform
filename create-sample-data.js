// create-sample-data.js
const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@sports.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';

// Sample data
const packages = [
  {
    "title": "Olympic Games Paris 2024",
    "description": "Experience the grandeur of the Olympic Games in Paris with premium access to opening ceremony, multiple sports events, and exclusive athlete interactions.",
    "basePrice": 250000,
    "dynamicPrice": 275000,
    "location": "Paris, France",
    "eventDate": "2024-07-26T00:00:00.000Z",
    "isFeatured": true,
    "category": "OLYMPICS",
    "image": "https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=800"
  },
  {
    "title": "FIFA World Cup 2026 - Quarter Finals",
    "description": "Witness world-class football action with premium quarter-final matches, stadium tours, and meet-and-greet opportunities with football legends.",
    "basePrice": 180000,
    "dynamicPrice": 195000,
    "location": "New York, USA",
    "eventDate": "2026-07-09T00:00:00.000Z",
    "isFeatured": true,
    "category": "FOOTBALL",
    "image": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800"
  },
  {
    "title": "Wimbledon Championships 2024",
    "description": "Premium Wimbledon experience with center court tickets, traditional strawberries & cream, and exclusive access to player practice sessions.",
    "basePrice": 120000,
    "dynamicPrice": 135000,
    "location": "London, UK",
    "eventDate": "2024-07-01T00:00:00.000Z",
    "isFeatured": true,
    "category": "TENNIS",
    "image": "https://images.unsplash.com/photo-1622279457486-62dcc4a431f8?w=800"
  },
  {
    "title": "NBA Finals 2024 Experience",
    "description": "Ultimate basketball experience with courtside seats, pre-game warmup access, and opportunities to meet NBA legends and current stars.",
    "basePrice": 95000,
    "dynamicPrice": 105000,
    "location": "Boston, USA",
    "eventDate": "2024-06-06T00:00:00.000Z",
    "isFeatured": false,
    "category": "BASKETBALL",
    "image": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800"
  },
  {
    "title": "ICC Cricket World Cup 2024 - Finals",
    "description": "Experience cricket's biggest tournament with premium finals tickets, exclusive hospitality, and interactions with cricket legends.",
    "basePrice": 85000,
    "dynamicPrice": 92000,
    "location": "Mumbai, India",
    "eventDate": "2024-11-15T00:00:00.000Z",
    "isFeatured": false,
    "category": "CRICKET",
    "image": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800"
  },
  {
    "title": "The Masters Golf Tournament 2024",
    "description": "Premium golf experience at Augusta National with practice round access, legendary course tour, and exclusive pro-am opportunities.",
    "basePrice": 150000,
    "dynamicPrice": 165000,
    "location": "Augusta, USA",
    "eventDate": "2024-04-11T00:00:00.000Z",
    "isFeatured": true,
    "category": "GOLF",
    "image": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"
  },
  {
    "title": "Formula 1 Monaco Grand Prix 2024",
    "description": "Ultimate F1 experience with premium grandstand seats, paddock access, yacht party, and opportunities to meet racing drivers.",
    "basePrice": 135000,
    "dynamicPrice": 148000,
    "location": "Monte Carlo, Monaco",
    "eventDate": "2024-05-26T00:00:00.000Z",
    "isFeatured": false,
    "category": "MOTORSPORTS",
    "image": "https://images.unsplash.com/photo-1583391737436-73552c0e8c03?w=800"
  }
];

const itineraries = [
  {
    "title": "5-Day Olympic Games Ultimate Experience",
    "description": "Comprehensive Olympic experience covering multiple sports, cultural activities, and exclusive behind-the-scenes access in Paris.",
    "basePrice": 350000,
    "duration": 5,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800"
  },
  {
    "title": "7-Day World Cup Football Extravaganza",
    "description": "Week-long football celebration with multiple matches, stadium tours, football museum visits, and legendary player interactions.",
    "basePrice": 220000,
    "duration": 7,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800"
  },
  {
    "title": "4-Day Wimbledon Tennis Tradition",
    "description": "Traditional Wimbledon experience with multiple day matches, English garden tours, and classic British cultural activities.",
    "basePrice": 145000,
    "duration": 4,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800"
  },
  {
    "title": "6-Day NBA Championship Tour",
    "description": "Basketball fan's dream with multiple NBA finals games, hall of fame visits, and exclusive training session observations.",
    "basePrice": 125000,
    "duration": 6,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800"
  },
  {
    "title": "5-Day Cricket World Cup Finale",
    "description": "Complete cricket experience with semi-finals and finals, cricket legend meetups, and traditional Indian cultural immersion.",
    "basePrice": 110000,
    "duration": 5,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800"
  },
  {
    "title": "4-Day Masters Golf Premium Weekend",
    "description": "Exclusive golf weekend at Augusta with premium course access, golf clinic with pros, and southern hospitality experiences.",
    "basePrice": 185000,
    "duration": 4,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"
  },
  {
    "title": "3-Day F1 Monaco Racing Thrill",
    "description": "High-octane weekend in Monaco with premium race views, luxury yacht experience, and Monte Carlo nightlife.",
    "basePrice": 160000,
    "duration": 3,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1583391737436-73552c0e8c03?w=800"
  }
];

const addons = [
  {
    "title": "VIP Stadium Tour & Meet Players",
    "description": "Exclusive behind-the-scenes stadium tour with opportunities to meet players and get autographs.",
    "basePrice": 15000,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800"
  },
  {
    "title": "Luxury Hotel Upgrade - 5 Star",
    "description": "Upgrade to 5-star luxury accommodation with premium amenities and city views.",
    "basePrice": 25000,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
  },
  {
    "title": "Private Airport Transfers",
    "description": "Luxury private car transfers to and from airport with professional chauffeur.",
    "basePrice": 8000,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800"
  },
  {
    "title": "Professional Photography Session",
    "description": "Professional photoshoot at the event venue with edited digital photos.",
    "basePrice": 12000,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800"
  },
  {
    "title": "Gourmet Dining Experience",
    "description": "Fine dining at top-rated restaurants with curated menus and premium beverages.",
    "basePrice": 18000,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"
  },
  {
    "title": "Exclusive After-Party Access",
    "description": "VIP access to official event after-parties with celebrity appearances.",
    "basePrice": 20000,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800"
  },
  {
    "title": "Personal Sports Guide",
    "description": "Dedicated sports expert guide providing insights and enhancing your event experience.",
    "basePrice": 15000,
    "packageIds": [],
    "image": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800"
  }
];

// API client with auth
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Login function
async function login() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await api.post('/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    authToken = response.data.access_token;
    console.log('✅ Login successful!');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    
    // Try to create admin if login fails
    console.log('🔄 Trying to create admin user...');
    try {
      await api.post('/auth/create-admin', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });
      console.log('✅ Admin user created! Trying to login again...');
      return await login(); // Retry login
    } catch (createError) {
      console.error('❌ Failed to create admin:', createError.response?.data || createError.message);
      return false;
    }
  }
}

// Create packages
async function createPackages() {
  console.log('\n📦 Creating packages...');
  const createdPackages = [];
  
  for (const pkg of packages) {
    try {
      const response = await api.post('/packages', pkg);
      createdPackages.push(response.data.data);
      console.log(`✅ Created package: ${pkg.title}`);
    } catch (error) {
      console.error(`❌ Failed to create package ${pkg.title}:`, error.response?.data || error.message);
    }
  }
  
  return createdPackages;
}

// Create itineraries and link to packages
async function createItineraries(createdPackages) {
  console.log('\n🗺️ Creating itineraries...');
  const createdItineraries = [];
  
  // Map package titles to IDs for linking
  const packageMap = {};
  createdPackages.forEach(pkg => {
    packageMap[pkg.title] = pkg.id;
  });
  
  // Link itineraries to appropriate packages
  const linkedItineraries = itineraries.map((itinerary, index) => {
    const packageTitles = [
      'Olympic Games Paris 2024',
      'FIFA World Cup 2026 - Quarter Finals', 
      'Wimbledon Championships 2024',
      'NBA Finals 2024 Experience',
      'ICC Cricket World Cup 2024 - Finals',
      'The Masters Golf Tournament 2024',
      'Formula 1 Monaco Grand Prix 2024'
    ];
    
    return {
      ...itinerary,
      packageIds: packageMap[packageTitles[index]] ? [packageMap[packageTitles[index]]] : []
    };
  });
  
  for (const itinerary of linkedItineraries) {
    try {
      const response = await api.post('/itineraries', itinerary);
      createdItineraries.push(response.data.data);
      console.log(`✅ Created itinerary: ${itinerary.title}`);
    } catch (error) {
      console.error(`❌ Failed to create itinerary ${itinerary.title}:`, error.response?.data || error.message);
    }
  }
  
  return createdItineraries;
}

// Create addons and link to all packages
async function createAddons(createdPackages) {
  console.log('\n✨ Creating addons...');
  const createdAddons = [];
  
  // Get all package IDs
  const allPackageIds = createdPackages.map(pkg => pkg.id);
  
  // Link addons to all packages
  const linkedAddons = addons.map(addon => ({
    ...addon,
    packageIds: allPackageIds
  }));
  
  for (const addon of linkedAddons) {
    try {
      const response = await api.post('/addons', addon);
      createdAddons.push(response.data.data);
      console.log(`✅ Created addon: ${addon.title}`);
    } catch (error) {
      console.error(`❌ Failed to create addon ${addon.title}:`, error.response?.data || error.message);
    }
  }
  
  return createdAddons;
}

// Create sample leads
async function createSampleLeads() {
  console.log('\n👥 Creating sample leads...');
  
  const sampleLeads = [
    {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1-555-0101',
      message: 'Interested in Olympic packages for my family',
      status: 'NEW'
    },
    {
      name: 'Maria Garcia',
      email: 'maria.garcia@example.com',
      phone: '+1-555-0102',
      message: 'Looking for World Cup quarter-final tickets',
      status: 'CONTACTED'
    },
    {
      name: 'David Chen',
      email: 'david.chen@example.com',
      phone: '+1-555-0103',
      message: 'Wimbledon experience for anniversary',
      status: 'CONVERTED'
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      phone: '+1-555-0104',
      message: 'NBA finals corporate package',
      status: 'FOLLOW_UP'
    }
  ];
  
  for (const lead of sampleLeads) {
    try {
      await api.post('/leads', lead);
      console.log(`✅ Created lead: ${lead.name}`);
    } catch (error) {
      console.error(`❌ Failed to create lead ${lead.name}:`, error.response?.data || error.message);
    }
  }
}

// Main function
async function main() {
  console.log('🚀 Starting automated data creation...\n');
  
  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  // Step 2: Create packages
  const createdPackages = await createPackages();
  
  // Step 3: Create itineraries (linked to packages)
  const createdItineraries = await createItineraries(createdPackages);
  
  // Step 4: Create addons (linked to all packages)
  const createdAddons = await createAddons(createdPackages);
  
  // Step 5: Create sample leads
  await createSampleLeads();
  
  // Summary
  console.log('\n🎉 Data creation completed!');
  console.log('📊 Summary:');
  console.log(`   📦 Packages: ${createdPackages.length}/7`);
  console.log(`   🗺️ Itineraries: ${createdItineraries.length}/7`);
  console.log(`   ✨ Addons: ${createdAddons.length}/7`);
  console.log(`   👥 Sample leads: 4`);
  
  console.log('\n🌐 Your sports travel platform is now populated with sample data!');
  console.log('📍 Frontend: http://localhost:3001');
  console.log('📍 Admin Panel: http://localhost:3001/admin');
}

// Run the script
main().catch(console.error);