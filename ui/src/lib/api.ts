import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Types
export interface Lead {
  id: string
  name?: string
  email?: string
  phone?: string
  message?: string
  role: string
  packageRecommendedByAi: string[]
  leadScore: number
  status: string
  createdAt: string
  orders?: Order[]
  aiConversations?: AiConversation[]
}

export interface Package {
  id: string
  title: string
  description?: string
  basePrice: number
  dynamicPrice?: number
  image?: string
  location: string
  eventDate?: string
  isFeatured: boolean
  category?: string
}

export interface Itinerary {
  id: string
  title: string
  description: string
  basePrice: number
  image?: string
  duration?: number
  packageIds: string[]
}

export interface AddOn {
  id: string
  title: string
  description?: string
  basePrice: number
  image?: string
  packageIds: string[]
}

export interface Order {
  id: string
  leadId: string
  packageId: string
  status: string
  createdAt: string
  package?: Package
  lead?: Lead
}

export interface AiConversation {
  id: string
  userMessage: string
  aiMessage: string
  createdAt: string
}

export interface AnalyticsSummary {
  totalLeads: number
  leadsByStatus: { status: string; _count: { id: number } }[]
  totalOrders: number
  packageViews: number
  ctaClicks: number
  conversionRate: number
  last7Days: { date: string; leads: number }[]
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },
}

// Leads API
export const leadsAPI = {
  create: async (leadData: Partial<Lead>) => {
    const { data } = await api.post('/leads', leadData)
    return data
  },
  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/leads', { params })
    return data
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await api.put(`/leads/${id}/status`, { status })
    return data
  },
  export: async (params?: { status?: string; search?: string }) => {
    const { data } = await api.get('/leads/export', { 
      params,
      responseType: 'blob'
    })
    return data
  },
}

// Packages API
export const packagesAPI = {
  getAll: async () => {
    const { data } = await api.get('/packages')
    return data
  },
  getFeatured: async () => {
    const { data } = await api.get('/packages/featured')
    return data
  },
  create: async (packageData: Partial<Package>) => {
    const { data } = await api.post('/packages', packageData)
    return data
  },
  update: async (id: string, packageData: Partial<Package>) => {
    const { data } = await api.put(`/packages/${id}`, packageData)
    return data
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/packages/${id}`)
    return data
  },
}

// Itineraries API
export const itinerariesAPI = {
  getAll: async () => {
    const { data } = await api.get('/itineraries')
    return data
  },
  create: async (itineraryData: Partial<Itinerary>) => {
    const { data } = await api.post('/itineraries', itineraryData)
    return data
  },
  update: async (id: string, itineraryData: Partial<Itinerary>) => {
    const { data } = await api.put(`/itineraries/${id}`, itineraryData)
    return data
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/itineraries/${id}`)
    return data
  },
}

// AddOns API
export const addonsAPI = {
  getAll: async () => {
    const { data } = await api.get('/addons')
    return data
  },
  create: async (addonData: Partial<AddOn>) => {
    const { data } = await api.post('/addons', addonData)
    return data
  },
  update: async (id: string, addonData: Partial<AddOn>) => {
    const { data } = await api.put(`/addons/${id}`, addonData)
    return data
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/addons/${id}`)
    return data
  },
}

// Orders API
export const ordersAPI = {
  create: async (orderData: { leadId: string; packageId: string; status?: string }) => {
    const { data } = await api.post('/orders', orderData)
    return data
  },
  getAll: async () => {
    const { data } = await api.get('/orders')
    return data
  },
}

// Analytics API
export const analyticsAPI = {
  trackEvent: async (eventData: {
    type: string
    page?: string
    section?: string
    element?: string
    metadata?: any
    packageId?: string
    itineraryId?: string
  }) => {
    const { data } = await api.post('/analytics/events', eventData)
    return data
  },
  getSummary: async (days?: number) => {
    const { data } = await api.get('/analytics/summary', { params: { days } })
    return data
  },
  getPopularPackages: async (days?: number) => {
    const { data } = await api.get('/analytics/popular-packages', { params: { days } })
    return data
  },
}

// AI API
export const aiAPI = {
  chat: async (message: string) => {
    const { data } = await api.post('/ai/chat', { message })
    return data
  },
  adminChat: async (message: string) => {
    const { data } = await api.post('/ai/admin/chat', { message })
    return data
  },
}

export default api


