'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'

export default function AdminHeader() {
  const router = useRouter()
  const { admin, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/admin/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gradient">Admin Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-gray-700">
            <User size={20} />
            <span className="font-medium">{admin?.name || admin?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={18} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}


