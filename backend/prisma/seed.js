// prisma/seed.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting sports-travel seeding...");

  // ---------------------------------------------------------
  // 1. CREATE EVENTS
  // ---------------------------------------------------------
  const events = await prisma.event.createMany({
    data: [
      {
        id: "evt-ucl-2026",
        title: "UEFA Champions League Final 2026",
        description: "Experience the biggest football event at Wembley Stadium.",
        location: "London, UK",
        startDate: new Date("2026-05-28T00:00:00Z"),
        endDate: new Date("2026-06-01T00:00:00Z"),
        image: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6",
        category: "Football",
        seasonMonths: [5, 6],
        isWeekend: true,
        slug: "ucl-final-2026",
        seoTitle: "UCL Final 2026 London",
        seoDescription: "Watch the UEFA Champions League Final 2026 at Wembley.",
        tags: ["ucl", "football", "wembley"],
      },
      {
        id: "evt-olympics-2026",
        title: "Paris Summer Games 2026",
        description: "The world’s biggest multi-sport event.",
        location: "Paris, France",
        startDate: new Date("2026-07-26T00:00:00Z"),
        endDate: new Date("2026-08-11T00:00:00Z"),
        image: "https://images.unsplash.com/photo-1505842465776-3b4953ca4f44",
        category: "Olympics",
        seasonMonths: [7, 8],
        isWeekend: false,
        slug: "paris-olympics-2026",
        seoTitle: "Paris Olympics 2026",
        seoDescription: "Travel packages for Paris 2026 Olympics.",
        tags: ["olympics", "paris"],
      },
      {
        id: "evt-f1-2026",
        title: "Formula 1 Singapore Grand Prix 2026",
        description: "Legendary F1 night race at Marina Bay.",
        location: "Singapore",
        startDate: new Date("2026-09-18T00:00:00Z"),
        endDate: new Date("2026-09-20T00:00:00Z"),
        image: "https://images.unsplash.com/photo-1518544889282-7e8a3f0f7e84",
        category: "Motorsport",
        seasonMonths: [9],
        isWeekend: true,
        slug: "f1-singapore-2026",
        seoTitle: "F1 Singapore 2026",
        seoDescription: "Night race at Marina Bay.",
        tags: ["f1", "singapore"],
      }
    ],
  });

  console.log("✔ Created 3 events");

  // ---------------------------------------------------------
  // 2. CREATE PACKAGES FOR EACH EVENT
  // ---------------------------------------------------------
  const eventsList = ["evt-ucl-2026", "evt-olympics-2026", "evt-f1-2026"];

  let packageData = [];

  for (const eventId of eventsList) {
    packageData.push(
      {
        eventId,
        title: "VIP Ticket + 5 Star Hotel",
        description: "Premium access and luxury stay.",
        basePrice: 2500,
        includes: ["VIP Seating", "5 Star Hotel", "Airport Pickup"],
        excludes: [],
        category: "VIP",
        minCapacity: 1,
        isFeatured: true,
        slug: `vip-${eventId}`,
        image: "https://images.unsplash.com/photo-1471295253337-3ceaaedca402",
      },
      {
        eventId,
        title: "Standard Ticket + Hotel",
        basePrice: 1800,
        includes: ["Standard Ticket", "4-Star Hotel"],
        excludes: [],
        category: "Standard",
        slug: `std-${eventId}`,
        image: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6",
      },
      {
        eventId,
        title: "Fan Zone Package",
        basePrice: 1200,
        includes: ["Fan Zone Access", "Souvenir"],
        excludes: [],
        category: "Fan",
        slug: `fan-${eventId}`,
        image: "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d",
      },
      {
        eventId,
        title: "City Sports Tour",
        basePrice: 900,
        includes: ["City Tour", "Sports Museum Visit"],
        excludes: [],
        category: "Experience",
        slug: `tour-${eventId}`,
        image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
      },
      {
        eventId,
        title: "Corporate Hospitality Box",
        basePrice: 6000,
        includes: ["Corporate Suite", "Unlimited Food & Drinks"],
        excludes: [],
        category: "Corporate",
        slug: `corp-${eventId}`,
        image: "https://images.unsplash.com/photo-1522770179533-24471fcdba45",
      },
      {
        eventId,
        title: "Budget Experience",
        basePrice: 700,
        includes: ["Match Ticket"],
        excludes: [],
        category: "Budget",
        slug: `budget-${eventId}`,
        image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d",
      }
    );
  }

  await prisma.package.createMany({ data: packageData });

  console.log("✔ Created 18 packages (6 for each event)");

  // ---------------------------------------------------------
  // 3. CREATE 5 ITINERARIES (NOT RELATED TO EVENTS)
  // ---------------------------------------------------------
  await prisma.itinerary.createMany({
    data: [
      {
        title: "City Stadium Tour",
        description: "Visit top stadiums.",
        dayNumber: 1,
        activities: { visit: "Stadiums" },
        basePrice: 100,
        duration: 4,
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3",
      },
      {
        title: "Sports Museum Visit",
        description: "Explore history of sports.",
        dayNumber: 2,
        activities: { visit: "Museum" },
        basePrice: 80,
        duration: 3,
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
      },
      {
        title: "Local Food & Sports Tour",
        dayNumber: 3,
        activities: { explore: "Food + Sports spots" },
        basePrice: 60,
        duration: 5,
        image: "https://images.unsplash.com/photo-1543340904-6c79b55a6f01",
      },
      {
        title: "Training Session Experience",
        dayNumber: 4,
        activities: { watch: "Athlete Training" },
        basePrice: 150,
        duration: 2,
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
      },
      {
        title: "Match Warm-up Access",
        dayNumber: 5,
        activities: { view: "Warm-up session" },
        basePrice: 200,
        duration: 3,
        image: "https://images.unsplash.com/photo-1517649763962-0c623066013b",
      }
    ]
  });

  console.log("✔ Created 5 itineraries");

  // ---------------------------------------------------------
  // 4. CREATE 5 ADDONS (NOT RELATED TO EVENTS)
  // ---------------------------------------------------------
  await prisma.addOn.createMany({
    data: [
      {
        title: "VIP Lounge Access",
        description: "Premium lounge + drinks",
        price: 300,
        image: "https://images.unsplash.com/photo-1522770179533-24471fcdba45",
      },
      {
        title: "Official Team Jersey",
        description: "Authentic merchandise",
        price: 120,
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
      },
      {
        title: "Fast Track Entry",
        description: "Skip queues",
        price: 60,
        image: "https://images.unsplash.com/photo-1533049022225-97b44c2d51cc",
      },
      {
        title: "Airport Pickup",
        description: "Pickup by premium cab",
        price: 40,
        image: "https://images.unsplash.com/photo-1502877338535-766e1452684a",
      },
      {
        title: "Merchandise Combo Pack",
        description: "Cap + Scarf + Wristband",
        price: 80,
        image: "https://images.unsplash.com/photo-1590874103328-52aab2b0674c",
      }
    ]
  });

  console.log("✔ Created 5 addons");

  console.log("\n🎉 SEEDING COMPLETED SUCCESSFULLY!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
