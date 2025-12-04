import { create } from 'zustand'
import { Lead } from '@/lib/api'

interface LeadState {
  currentLead: Partial<Lead> | null
  setCurrentLead: (lead: Partial<Lead>) => void
  updateLead: (updates: Partial<Lead>) => void
  clearLead: () => void
}

export const useLeadStore = create<LeadState>((set) => ({
  currentLead: null,
  setCurrentLead: (lead) => set({ currentLead: lead }),
  updateLead: (updates) =>
    set((state) => ({
      currentLead: state.currentLead ? { ...state.currentLead, ...updates } : updates,
    })),
  clearLead: () => set({ currentLead: null }),
}))


