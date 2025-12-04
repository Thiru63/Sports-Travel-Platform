import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Admin {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  admin: Admin | null
  token: string | null
  isAuthenticated: boolean
  login: (admin: Admin, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      login: (admin, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_token', token)
        }
        set({ admin, token, isAuthenticated: true })
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token')
        }
        set({ admin: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)


