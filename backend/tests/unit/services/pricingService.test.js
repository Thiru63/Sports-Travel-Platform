import PricingService from '../../../src/services/pricingService.js';

describe('PricingService', () => {
  let pricingService;
  
  beforeEach(() => {
    pricingService = new PricingService();
  });

  describe('getSeasonalMultiplier', () => {
    it('should return 0.2 for June, July, December (high season)', () => {
      const mockEvent = { seasonMonths: [6, 7, 12] };
      
      expect(pricingService.getSeasonalMultiplier(mockEvent, 6)).toBe(0.2);
      expect(pricingService.getSeasonalMultiplier(mockEvent, 7)).toBe(0.2);
      expect(pricingService.getSeasonalMultiplier(mockEvent, 12)).toBe(0.2);
    });

    it('should return 0.1 for April, May, September (mid season)', () => {
      const mockEvent = { seasonMonths: [4, 5, 9] };
      
      expect(pricingService.getSeasonalMultiplier(mockEvent, 4)).toBe(0.1);
      expect(pricingService.getSeasonalMultiplier(mockEvent, 5)).toBe(0.1);
      expect(pricingService.getSeasonalMultiplier(mockEvent, 9)).toBe(0.1);
    });

    it('should return 0 for other months', () => {
      const mockEvent = { seasonMonths: [] };
      
      expect(pricingService.getSeasonalMultiplier(mockEvent, 1)).toBe(0);
      expect(pricingService.getSeasonalMultiplier(mockEvent, 8)).toBe(0);
    });

    it('should use default logic when event has no seasonMonths', () => {
      const mockEvent = {};
      
      expect(pricingService.getSeasonalMultiplier(mockEvent, 6)).toBe(0.2);
      expect(pricingService.getSeasonalMultiplier(mockEvent, 5)).toBe(0.1);
      expect(pricingService.getSeasonalMultiplier(mockEvent, 1)).toBe(0);
    });
  });

  describe('calculateEarlyBirdDiscount', () => {
    it('should return 0.1 when 120+ days before event', () => {
      expect(pricingService.calculateEarlyBirdDiscount(120)).toBe(0.1);
      expect(pricingService.calculateEarlyBirdDiscount(150)).toBe(0.1);
    });

    it('should return 0 when less than 120 days before event', () => {
      expect(pricingService.calculateEarlyBirdDiscount(119)).toBe(0);
      expect(pricingService.calculateEarlyBirdDiscount(30)).toBe(0);
    });

    it('should return 0.1 when before package early bird cutoff', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      expect(pricingService.calculateEarlyBirdDiscount(50, futureDate.toISOString())).toBe(0.1);
    });

    it('should return 0 when after package early bird cutoff', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      expect(pricingService.calculateEarlyBirdDiscount(150, pastDate.toISOString())).toBe(0);
    });
  });

  describe('calculateLastMinuteSurcharge', () => {
    it('should return 0.25 when less than 15 days before event', () => {
      expect(pricingService.calculateLastMinuteSurcharge(14)).toBe(0.25);
      expect(pricingService.calculateLastMinuteSurcharge(1)).toBe(0.25);
    });

    it('should return 0 when 15+ days before event', () => {
      expect(pricingService.calculateLastMinuteSurcharge(15)).toBe(0);
      expect(pricingService.calculateLastMinuteSurcharge(30)).toBe(0);
    });
  });

  describe('calculateGroupDiscount', () => {
    it('should return 0.08 for 4+ travellers', () => {
      expect(pricingService.calculateGroupDiscount(4)).toBe(0.08);
      expect(pricingService.calculateGroupDiscount(10)).toBe(0.08);
    });

    it('should return 0 for less than 4 travellers', () => {
      expect(pricingService.calculateGroupDiscount(3)).toBe(0);
      expect(pricingService.calculateGroupDiscount(1)).toBe(0);
    });

    it('should respect package min capacity', () => {
      expect(pricingService.calculateGroupDiscount(4, 5)).toBe(0); // Need min 5
      expect(pricingService.calculateGroupDiscount(5, 5)).toBe(0.08); // Meets min capacity
    });
  });

  describe('calculateWeekendSurcharge', () => {
    it('should return 0.08 when event includes weekend', () => {
      const mockEvent = { isWeekend: true };
      const travelDates = ['2024-12-06', '2024-12-08']; // Friday to Sunday
      
      expect(pricingService.calculateWeekendSurcharge(mockEvent, travelDates)).toBe(0.08);
    });

    it('should return 0 when event does not include weekend', () => {
      const mockEvent = { isWeekend: false };
      const travelDates = ['2024-12-02', '2024-12-04']; // Monday to Wednesday
      
      expect(pricingService.calculateWeekendSurcharge(mockEvent, travelDates)).toBe(0);
    });

    it('should calculate from dates when no isWeekend flag', () => {
      const mockEvent = {};
      const weekendDates = ['2024-12-07', '2024-12-08']; // Saturday to Sunday
      const weekdayDates = ['2024-12-02', '2024-12-04']; // Monday to Wednesday
      
      expect(pricingService.calculateWeekendSurcharge(mockEvent, weekendDates)).toBe(0.08);
      expect(pricingService.calculateWeekendSurcharge(mockEvent, weekdayDates)).toBe(0);
    });
  });

  describe('calculateQuote', () => {
    let mockEvent, mockPackage, mockDate;

    beforeEach(() => {
      mockDate = new Date('2024-12-01');
      mockEvent = {
        id: 'event-123',
        title: 'F1 Grand Prix',
        startDate: mockDate,
        seasonMonths: [12],
        isWeekend: true,
      };
      
      mockPackage = {
        id: 'package-123',
        basePrice: 1000,
        minCapacity: 1,
        earlyBirdCutoff: null,
      };

      // Mock Date.now for consistent testing
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate('2024-08-01'); // 120 days before event
          }
          return new originalDate(...args);
        }
        
        static now() {
          return new originalDate('2024-08-01').getTime();
        }
      };
    });

    afterEach(() => {
      // Restore original Date
      global.Date = Date;
    });

    it('should calculate correct pricing for early bird weekend event', async () => {
      const result = await pricingService.calculateQuote(
        1000,
        mockEvent,
        mockPackage,
        4,
        ['2024-12-06', '2024-12-08']
      );

      // Expected: 1000 + 200 (20% seasonal) - 100 (10% early bird) - 80 (8% group) + 80 (8% weekend)
      expect(result.basePrice).toBe(1000);
      expect(result.seasonalMultiplier).toBe(0.2);
      expect(result.seasonalAdjustment).toBe(200);
      expect(result.earlyBirdDiscount).toBe(0.1);
      expect(result.earlyBirdAdjustment).toBe(100);
      expect(result.groupDiscount).toBe(0.08);
      expect(result.groupAdjustment).toBe(80);
      expect(result.weekendSurcharge).toBe(0.08);
      expect(result.weekendAdjustment).toBe(80);
      expect(result.subtotal).toBe(1100);
      expect(result.daysUntilEvent).toBe(122);
      expect(result.includesWeekend).toBe(true);
    });

    it('should calculate correct pricing for last minute weekday event', async () => {
      // Set current date to be 10 days before event
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate('2024-11-21'); // 10 days before event
          }
          return new originalDate(...args);
        }
        
        static now() {
          return new originalDate('2024-11-21').getTime();
        }
      };

      const weekdayEvent = { ...mockEvent, isWeekend: false, seasonMonths: [11] };
      const result = await pricingService.calculateQuote(
        800,
        weekdayEvent,
        mockPackage,
        2,
        ['2024-12-01', '2024-12-03']
      );

      // Expected: 800 + 80 (10% seasonal) + 200 (25% last minute) - 0 group + 0 weekend
      expect(result.basePrice).toBe(800);
      expect(result.seasonalMultiplier).toBe(0.1);
      expect(result.seasonalAdjustment).toBe(80);
      expect(result.lastMinuteSurcharge).toBe(0.25);
      expect(result.lastMinuteAdjustment).toBe(200);
      expect(result.groupDiscount).toBe(0);
      expect(result.groupAdjustment).toBe(0);
      expect(result.weekendSurcharge).toBe(0);
      expect(result.weekendAdjustment).toBe(0);
      expect(result.subtotal).toBe(1080);
      expect(result.daysUntilEvent).toBe(10);

      global.Date = originalDate;
    });

    it('should handle edge cases correctly', async () => {
      // Test with 0 base price
      const result = await pricingService.calculateQuote(
        0,
        mockEvent,
        mockPackage,
        1,
        ['2024-12-01', '2024-12-03']
      );

      expect(result.basePrice).toBe(0);
      expect(result.subtotal).toBe(0);
    });

    it('should apply package early bird cutoff', async () => {
      const packageWithCutoff = {
        ...mockPackage,
        earlyBirdCutoff: new Date('2024-09-01').toISOString(),
      };

      const result = await pricingService.calculateQuote(
        1000,
        mockEvent,
        packageWithCutoff,
        2,
        ['2024-12-01', '2024-12-03']
      );

      expect(result.earlyBirdDiscount).toBe(0.1); // Before cutoff
      expect(result.earlyBirdAdjustment).toBe(100);
    });
  });
});