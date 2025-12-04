// src/services/leadService.js
export class LeadService {
  // Valid status transitions
  statusWorkflow = [
    'NEW',
    'CONTACTED', 
    'QUOTE_SENT',
    'INTERESTED',
    'CLOSED_WON',
    'CLOSED_LOST',
  ];
  
  // Valid transitions map
  validTransitions = {
    NEW: ['CONTACTED', 'CLOSED_LOST'],
    CONTACTED: ['QUOTE_SENT', 'CLOSED_LOST'],
    QUOTE_SENT: ['INTERESTED', 'CONTACTED', 'CLOSED_LOST'],
    INTERESTED: ['QUOTE_SENT', 'CLOSED_WON', 'CLOSED_LOST'],
    CLOSED_WON: [], // Terminal state
    CLOSED_LOST: ['CONTACTED'], // Can re-engage
  };
  
  validateStatusTransition(fromStatus, toStatus) {
    // Check if statuses are valid
    if (!this.statusWorkflow.includes(fromStatus) || !this.statusWorkflow.includes(toStatus)) {
      return false;
    }
    
    // Allow same status (no change)
    if (fromStatus === toStatus) {
      return true;
    }
    
    // Check valid transitions
    return this.validTransitions[fromStatus]?.includes(toStatus) || false;
  }
  
  // Calculate lead score based on various factors
  calculateLeadScore(lead) {
    let score = 0;
    
    // Email completeness
    if (lead.email) score += 20;
    
    // Phone completeness
    if (lead.phone) score += 15;
    
    // Company information
    if (lead.company) score += 10;
    
    // Position information
    if (lead.position) score += 5;
    
    // Engagement factors (would come from analytics)
    // For now, using quote count as engagement metric
    if (lead.quotes && lead.quotes.length > 0) {
      score += Math.min(lead.quotes.length * 10, 30);
    }
    
    // Recent activity bonus
    const daysSinceCreation = Math.floor(
      (new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreation <= 7) {
      score += 20; // New lead bonus
    }
    
    return Math.min(score, 100);
  }
}

export const leadService = new LeadService();