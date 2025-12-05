// seed/seed.js
import axios from "axios";

const API_URL = "http://localhost:3000/api"; // change if needed
const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZTNmMGFlYi0yZmI1LTRkZDgtYThiOS0yZDdmZTdiYjMzZGMiLCJlbWFpbCI6ImFkbWluQHNwb3J0cy5jb20iLCJuYW1lIjoiQWRtaW4gVXNlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2NDg5NDM2NywiZXhwIjoxNzY0OTgwNzY3fQ.IaLoYdlr2uWWnFKK5Tvo7C2VD6cd6g2fJ1Hdns5kK4Y"
const config = {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json' // Often good practice to explicitly set this too
  }
};
async function runSeed() {
  try {
    console.log("🚀 Starting seed script...\n");

    // --------------------------------------------------------
    // 1. POST EVENTS
    // --------------------------------------------------------
    console.log("📌 Posting Events...");

    const eventsPayload = [
      {
        title: "UEFA Champions League Final 2026",
        description: "Experience the biggest football final live at Wembley Stadium.",
        location: "London, UK",
        startDate: "2026-05-28T00:00:00Z",
        endDate: "2026-06-01T00:00:00Z",
        image: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6",
        category: "Football",
        seasonMonths: [5, 6],
        isWeekend: true,
        slug: "ucl-final-2026",
        seoTitle: "UCL Final 2026 London",
        seoDescription: "Watch the UEFA Champions League Final 2026 live at Wembley.",
        tags: ["football", "ucl", "wembley"]
      },
      {
        title: "Paris Summer Games 2026",
        description: "Global multi-sport event in Paris.",
        location: "Paris, France",
        startDate: "2026-07-26T00:00:00Z",
        endDate: "2026-08-11T00:00:00Z",
        image: "https://images.unsplash.com/photo-1505842465776-3b4953ca4f44",
        category: "Olympics",
        seasonMonths: [7, 8],
        isWeekend: false,
        slug: "paris-olympics-2026",
        seoTitle: "Paris Olympics 2026",
        seoDescription: "Enjoy the Paris 2026 Summer Olympic Games live.",
        tags: ["olympics", "sports", "paris"]
      },
      {
        title: "Formula 1 Singapore Grand Prix 2026",
        description: "The legendary night race at Marina Bay.",
        location: "Singapore",
        startDate: "2026-09-18T00:00:00Z",
        endDate: "2026-09-20T00:00:00Z",
        image: "https://images.unsplash.com/photo-1518544889282-7e8a3f0f7e84",
        category: "Motorsport",
        seasonMonths: [9],
        isWeekend: true,
        slug: "f1-singapore-2026",
        seoTitle: "F1 Singapore 2026",
        seoDescription: "Attend the Formula 1 Singapore 2026 night race.",
        tags: ["formula1", "f1", "singapore"]
      }
    ];

    const eventIds = [];

    for (const event of eventsPayload) {
      const res = await axios.post(`${API_URL}/events`, event,config);
      eventIds.push(res.data.data.id);
      console.log("✔ Created Event:", res.data.data.title);
    }

    console.log("\n🎉 Events Created:", eventIds, "\n");

    // --------------------------------------------------------
    // 2. POST PACKAGES FOR EACH EVENT
    // --------------------------------------------------------
    console.log("📌 Posting Packages...");

    const packagesTemplate = (eventId) => [
      {
        eventId,
        title: "VIP Ticket + 5 Star Hotel",
        description: "Premium VIP seating + hotel stay.",
        basePrice: 2500,
        includes: ["VIP Ticket", "Hotel", "Airport Pickup"],
        category: "VIP",
        image: "https://images.unsplash.com/photo-1471295253337-3ceaaedca402",
        minCapacity: 1,
        isFeatured: true,
        slug: `vip-${eventId}`
      },
      {
        eventId,
        title: "Standard Ticket + Hotel",
        basePrice: 1800,
        includes: ["Standard Ticket", "4-Star Hotel"],
        category: "Standard",
        image: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6",
        slug: `standard-${eventId}`
      },
      {
        eventId,
        title: "Fan Zone Package",
        basePrice: 1200,
        includes: ["Fan Zone Access", "Souvenir"],
        category: "Fan",
        image: "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d",
        slug: `fan-${eventId}`
      },
      {
        eventId,
        title: "Local City Sports Tour",
        basePrice: 900,
        includes: ["City Tour", "Sports Museum Pass"],
        category: "Experience",
        image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
        slug: `tour-${eventId}`
      },
      {
        eventId,
        title: "Corporate Hospitality Box",
        basePrice: 6000,
        includes: ["Corporate Suite", "Unlimited Food"],
        category: "Corporate",
        image: "https://images.unsplash.com/photo-1522770179533-24471fcdba45",
        slug: `corporate-${eventId}`
      },
      {
        eventId,
        title: "Budget Experience Ticket",
        basePrice: 700,
        includes: ["Match Ticket"],
        category: "Budget",
        image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
        slug: `budget-${eventId}`
      }
    ];

    for (const eventId of eventIds) {
      const pkgs = packagesTemplate(eventId);
      for (const pkg of pkgs) {
        await axios.post(`${API_URL}/packages`, pkg,config);
      }
      console.log(`✔ Packages added for event: ${eventId}`);
    }

    // --------------------------------------------------------
    // 3. POST ITINERARIES (NOT LINKED TO ANY EVENT)
    // --------------------------------------------------------
    console.log("\n📌 Posting Itineraries...");

    const itineraries = [
      {
        title: "City Stadium Tour",
        description: "Visit top stadiums in the city.",
        dayNumber: 1,
        activities: [{ time: "10:00", activity: "Stadium Tour" }],
        basePrice: 100,
        duration: 5,
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3"
      },
      {
        title: "Sports Museum Visit",
        description: "Explore famous sporting history.",
        dayNumber: 2,
        activities: [{ time: "12:00", activity: "Museum Tour" }],
        basePrice: 80,
        duration: 3,
        image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d"
      },
      {
        title: "Local Food + Sports Tour",
        dayNumber: 3,
        activities: [{ time: "15:00", activity: "Food Tour" }],
        basePrice: 60,
        duration: 4,
        image: "https://images.unsplash.com/photo-1543340904-6c79b55a6f01"
      },
      {
        title: "Athlete Training Session",
        dayNumber: 4,
        basePrice: 150,
        activities: [{ time: "11:00", activity: "Training Watch" }],
        duration: 2,
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b"
      },
      {
        title: "Match Warm-Up Experience",
        dayNumber: 5,
        basePrice: 200,
        activities: [{ time: "09:00", activity: "Warm-up View" }],
        duration: 3,
        image: "https://images.unsplash.com/photo-1517649763962-0c623066013b"
      }
    ];

    for (const it of itineraries) {
      await axios.post(`${API_URL}/itineraries`, it,config);
    }

    console.log("✔ 5 Itineraries created!");

    // --------------------------------------------------------
    // 4. POST ADDONS (NOT LINKED TO EVENTS)
    // --------------------------------------------------------
    console.log("\n📌 Posting Addons...");

    const addons = [
      {
        title: "VIP Lounge Access",
        description: "Premium lounge + drinks",
        price: 300,
        image: "https://images.unsplash.com/photo-1522770179533-24471fcdba45"
      },
      {
        title: "Official Team Jersey",
        price: 120,
        description: "Authentic jersey",
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f"
      },
      {
        title: "Fast Track Entry",
        price: 60,
        description: "Skip long entry queues",
        image: "https://images.unsplash.com/photo-1533049022225-97b44c2d51cc"
      },
      {
        title: "Airport Pickup",
        price: 40,
        description: "Includes 1-way airport transfer",
        image: "https://images.unsplash.com/photo-1502877338535-766e1452684a"
      },
      {
        title: "Merchandise Pack",
        price: 80,
        description: "Scarf + Cap + Wristband",
        image: "https://images.unsplash.com/photo-1590874103328-52aab2b0674c"
      }
    ];

    for (const addon of addons) await axios.post(`${API_URL}/addons`, addon,config);

    console.log("✔ 5 Addons created!");

    console.log("\n🎉 SEEDING COMPLETED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Seed Error:", error.response?.data || error.message);
  }
}

runSeed();
