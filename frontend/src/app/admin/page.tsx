'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Package, TrendingUp, DollarSign } from 'lucide-react'
import { analyticsAPI } from '@/lib/api'
import { AnalyticsSummary } from '@/lib/api'
import DashboardStats from '@/components/Admin/Dashboard/DashboardStats'
import RecentActivities from '@/components/Admin/Dashboard/RecentActivities'
import QuickActions from '@/components/Admin/Dashboard/QuickActions'
import AnalyticsChart from '@/components/Admin/Dashboard/AnalyticsChart'

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await analyticsAPI.getSummary(7)
        if (response.success) {
          setAnalytics(response.data)
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const stats = [
    {
      icon: Users,
      label: 'Total Leads',
      value: analytics?.totalLeads || 0,
      change: '+12%',
      changeType: 'positive' as const,
      color: 'bg-blue-500',
    },
    {
      icon: Package,
      label: 'Packages Booked',
      value: analytics?.totalOrders || 0,
      change: '+8%',
      changeType: 'positive' as const,
      color: 'bg-green-500',
    },
    {
      icon: TrendingUp,
      label: 'Conversion Rate',
      value: `${analytics?.conversionRate.toFixed(1) || 0}%`,
      change: '-0.5%',
      changeType: 'negative' as const,
      color: 'bg-yellow-500',
    },
    {
      icon: DollarSign,
      label: 'Revenue',
      value: '$125,000',
      change: '+15%',
      changeType: 'positive' as const,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
      </motion.div>

      {/* Stats Grid */}
      <DashboardStats stats={stats} isLoading={isLoading} />

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <div className="lg:col-span-2">
          <AnalyticsChart data={analytics?.last7Days || []} />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Recent Activities */}
      <RecentActivities />
    </div>
  )
}


