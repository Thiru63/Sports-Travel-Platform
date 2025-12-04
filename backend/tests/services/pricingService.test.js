/**
 * Dynamic, Stable Test Suite for PricingService
 * Uses a fixed mocked "today" so tests never break.
 */

import pricingService from "../../src/services/pricingService.js";

describe("PricingService – Business Rules", () => {
  // ---- FIXED MOCKED TODAY ----
  const MOCK_TODAY = new Date("2025-06-01T00:00:00Z"); // Stable, but not "hardcoded logic"
  jest.useFakeTimers().setSystemTime(MOCK_TODAY);

  const addDays = (date, days) =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

  // ─────────────────────────────────────────────
  // 1) Seasonal Multiplier Tests
  // ─────────────────────────────────────────────
  describe("getSeasonalMultiplier()", () => {
    test("returns +20% for June, July, December", () => {
      expect(pricingService.getSeasonalMultiplier({}, 6)).toBe(0.2);
      expect(pricingService.getSeasonalMultiplier({}, 7)).toBe(0.2);
      expect(pricingService.getSeasonalMultiplier({}, 12)).toBe(0.2);
    });

    test("returns +10% for April, May, September", () => {
      expect(pricingService.getSeasonalMultiplier({}, 4)).toBe(0.1);
      expect(pricingService.getSeasonalMultiplier({}, 5)).toBe(0.1);
      expect(pricingService.getSeasonalMultiplier({}, 9)).toBe(0.1);
    });

    test("returns 0 for non-season months", () => {
      expect(pricingService.getSeasonalMultiplier({}, 2)).toBe(0);
      expect(pricingService.getSeasonalMultiplier({}, 10)).toBe(0);
    });

    test("uses event.seasonMonths when provided", () => {
      const event = { seasonMonths: [3, 4] };
      expect(pricingService.getSeasonalMultiplier(event, 3)).toBe(0.2);
    });
  });

  // ─────────────────────────────────────────────
  // 2) Early-Bird Discount
  // ─────────────────────────────────────────────
  describe("calculateEarlyBirdDiscount()", () => {
    test("applies -10% when daysUntilEvent >= 120", () => {
      expect(pricingService.calculateEarlyBirdDiscount(150)).toBe(0.1);
      expect(pricingService.calculateEarlyBirdDiscount(120)).toBe(0.1);
      expect(pricingService.calculateEarlyBirdDiscount(119)).toBe(0);
    });

    test("respects packageEarlyBirdCutoff when provided", () => {
      const futureCutoff = addDays(MOCK_TODAY, 5); // still valid
      const pastCutoff = addDays(MOCK_TODAY, -1); // expired cutoff

      expect(pricingService.calculateEarlyBirdDiscount(10, futureCutoff)).toBe(0.1);
      expect(pricingService.calculateEarlyBirdDiscount(10, pastCutoff)).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // 3) Last-Minute Surcharge
  // ─────────────────────────────────────────────
  describe("calculateLastMinuteSurcharge()", () => {
    test("adds +25% when < 15 days before event", () => {
      expect(pricingService.calculateLastMinuteSurcharge(14)).toBe(0.25);
      expect(pricingService.calculateLastMinuteSurcharge(1)).toBe(0.25);
    });

    test("returns 0 when >= 15 days", () => {
      expect(pricingService.calculateLastMinuteSurcharge(15)).toBe(0);
      expect(pricingService.calculateLastMinuteSurcharge(50)).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // 4) Group Discount
  // ─────────────────────────────────────────────
  describe("calculateGroupDiscount()", () => {
    test("applies -8% for travellers >= 4", () => {
      expect(pricingService.calculateGroupDiscount(4)).toBe(0.08);
      expect(pricingService.calculateGroupDiscount(6)).toBe(0.08);
    });

    test("returns 0 for travellers < 4", () => {
      expect(pricingService.calculateGroupDiscount(3)).toBe(0);
    });

    test("respects packageMinCapacity", () => {
      // If package.minCapacity = 5, group discount applies only when travellers >= 5
      expect(pricingService.calculateGroupDiscount(4, 5)).toBe(0);
      expect(pricingService.calculateGroupDiscount(5, 5)).toBe(0.08);
    });
  });

  // ─────────────────────────────────────────────
  // 5) Weekend Surcharge
  // ─────────────────────────────────────────────
  describe("calculateWeekendSurcharge()", () => {
    test("uses event.isWeekend flag when provided", () => {
      expect(pricingService.calculateWeekendSurcharge({ isWeekend: true }, [])).toBe(0.08);
      expect(pricingService.calculateWeekendSurcharge({ isWeekend: false }, [])).toBe(0);
    });

    test("detects weekend inside travel dates", () => {
      const fri = new Date("2025-01-03T00:00:00Z");
      const sat = new Date("2025-01-04T00:00:00Z");

      expect(pricingService.calculateWeekendSurcharge({}, [fri, sat])).toBe(0.08);
    });
  });

  // ─────────────────────────────────────────────
  // 6) Combined Total Quote Calculation
  // ─────────────────────────────────────────────
  describe("calculateQuote()", () => {
    test("applies all pricing rules correctly", async () => {
      const basePrice = 1000;

      const eventDate = addDays(MOCK_TODAY, 150); // early bird applies
      const event = { startDate: eventDate };

      // Travel dates: Next month, includes a weekend
      const month = MOCK_TODAY.getMonth() + 1;
      const travelStart = new Date(MOCK_TODAY.getFullYear(), month, 3); // Jan 3 = Friday
      const travelEnd = new Date(MOCK_TODAY.getFullYear(), month, 5);   // Jan 5 = Sunday

      const pkg = { minCapacity: 1 };
      const travellers = 4;

      const result = await pricingService.calculateQuote(
        basePrice,
        event,
        pkg,
        travellers,
        [travelStart, travelEnd]
      );

      // Expected multipliers
      const travelMonth = travelStart.getMonth() + 1;
      const seasonal = pricingService.getSeasonalMultiplier(event, travelMonth);
      const earlyBird = pricingService.calculateEarlyBirdDiscount(150);
      const groupDisc = pricingService.calculateGroupDiscount(4, 1);
      const weekend = 0.08; // weekend included

      // Compute expected subtotal manually
      const expectedSubtotal =
        basePrice +
        basePrice * seasonal -
        basePrice * earlyBird +
        0 + // no last-minute
        -basePrice * groupDisc +
        basePrice * weekend;

      expect(result.subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(result.includesWeekend).toBe(true);
    });
  });
});
