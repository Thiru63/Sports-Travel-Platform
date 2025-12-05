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
        console.log('Dashboard analytics response:', response)
        if (response.success && response.data) {
          // Map backend response to frontend format
          const mappedData: AnalyticsSummary = {
            totalLeads: response.data.overview?.leadConversions || 0,
            leadsByStatus: [],
            totalOrders: response.data.overview?.quoteGenerations || 0,
            packageViews: response.data.overview?.pageViews || 0,
            ctaClicks: 0, // Not in backend response
            conversionRate: response.data.overview?.conversionRate || 0,
            last7Days: response.data.dailyStats?.slice(-7).map((stat: any) => ({
              date: stat.date,
              leads: stat.leads || 0,
            })) || [],
          }
          setAnalytics(mappedData)
        } else {
          // Set default empty data
          setAnalytics({
            totalLeads: 0,
            leadsByStatus: [],
            totalOrders: 0,
            packageViews: 0,
            ctaClicks: 0,
            conversionRate: 0,
            last7Days: [],
          })
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
        // Set default empty data on error
        setAnalytics({
          totalLeads: 0,
          leadsByStatus: [],
          totalOrders: 0,
          packageViews: 0,
          ctaClicks: 0,
          conversionRate: 0,
          last7Days: [],
        })
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
      value: `${analytics?.conversionRate ? analytics.conversionRate.toFixed(1) : 0}%`,
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
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-sm md:text-base text-gray-600">Welcome back! Here's what's happening with your business.</p>
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


