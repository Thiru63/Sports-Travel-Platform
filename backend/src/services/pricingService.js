// src/services/pricingService.js
export class PricingService {
  // Get season months from event metadata
  getSeasonalMultiplier(event, travelMonth) {
    // If event has seasonMonths defined, use them
    if (event.seasonMonths && Array.isArray(event.seasonMonths)) {
      if (event.seasonMonths.includes(travelMonth)) {
        return 0.2; // +20% for season months
      }
    }
    
    // Fallback to default logic
    if ([6, 7, 12].includes(travelMonth)) {
      return 0.2; // June, July, December → +20%
    }
    if ([4, 5, 9].includes(travelMonth)) {
      return 0.1; // April, May, September → +10%
    }
    return 0;
  }
  
  calculateEarlyBirdDiscount(daysUntilEvent, packageEarlyBirdCutoff = null) {
    // Check package-specific early bird cutoff
    if (packageEarlyBirdCutoff) {
      const cutoffDate = new Date(packageEarlyBirdCutoff);
      const today = new Date();
      if (today <= cutoffDate) {
        return 0.1; // -10% if before package cutoff
      }
    }
    
    // Default: 120 days before event
    return daysUntilEvent >= 120 ? 0.1 : 0;
  }
  
  calculateLastMinuteSurcharge(daysUntilEvent) {
    return daysUntilEvent < 15 ? 0.25 : 0;
  }
  
  calculateGroupDiscount(travellers, packageMinCapacity = 1) {
    // Only apply if at least package minimum capacity
    if (travellers >= Math.max(4, packageMinCapacity)) {
      return 0.08;
    }
    return 0;
  }
  
  calculateWeekendSurcharge(event, travelDates) {
    // Use event flag if available
    if (event.isWeekend !== undefined) {
      return event.isWeekend ? 0.08 : 0;
    }
    
    // Calculate from dates
    const start = new Date(travelDates[0]);
    const end = new Date(travelDates[1]);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || day === 6) {
        return 0.08;
      }
    }
    
    return 0;
  }
  
  async calculateQuote(basePrice, event, package_, travellers, travelDates) {
    const today = new Date();
    const eventDate = event.startDate;
    const travelStart = new Date(travelDates[0]);
    
    // Calculate days until event
    const daysUntilEvent = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
    
    // Get travel month
    const travelMonth = travelStart.getMonth() + 1;
    
    // Calculate all adjustments
    const seasonalMultiplier = this.getSeasonalMultiplier(event, travelMonth);
    const earlyBirdDiscount = this.calculateEarlyBirdDiscount(daysUntilEvent, package_.earlyBirdCutoff);
    const lastMinuteSurcharge = this.calculateLastMinuteSurcharge(daysUntilEvent);
    const groupDiscount = this.calculateGroupDiscount(travellers, package_.minCapacity);
    const weekendSurcharge = this.calculateWeekendSurcharge(event, travelDates);
    
    // Calculate adjustment amounts
    const base = Number(basePrice);
    const seasonalAdjustment = base * seasonalMultiplier;
    const earlyBirdAdjustment = base * earlyBirdDiscount;
    const lastMinuteAdjustment = base * lastMinuteSurcharge;
    const groupAdjustment = base * groupDiscount;
    const weekendAdjustment = base * weekendSurcharge;
    
    // Calculate subtotal
    const subtotal = base + 
      seasonalAdjustment - 
      earlyBirdAdjustment + 
      lastMinuteAdjustment - 
      groupAdjustment + 
      weekendAdjustment;
    
    return {
      basePrice: base,
      seasonalMultiplier,
      seasonalAdjustment: Number(seasonalAdjustment.toFixed(2)),
      earlyBirdDiscount,
      earlyBirdAdjustment: Number(earlyBirdAdjustment.toFixed(2)),
      lastMinuteSurcharge,
      lastMinuteAdjustment: Number(lastMinuteAdjustment.toFixed(2)),
      groupDiscount,
      groupAdjustment: Number(groupAdjustment.toFixed(2)),
      weekendSurcharge,
      weekendAdjustment: Number(weekendAdjustment.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      daysUntilEvent,
      includesWeekend: weekendSurcharge > 0,
    };
  }
}

export default new PricingService();