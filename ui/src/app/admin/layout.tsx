'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import AdminSidebar from '@/components/Admin/AdminSidebar'
import AdminHeader from '@/components/Admin/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()
  const isLoginRoute = pathname?.startsWith('/admin/login')

  useEffect(() => {
    if (!isLoginRoute && !isAuthenticated) {
      router.push('/admin/login')
    }
    if (isLoginRoute && isAuthenticated) {
      router.push('/admin')
    }
  }, [isLoginRoute, isAuthenticated, router])

  if (isLoginRoute) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

