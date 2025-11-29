'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Eye, MousePointerClick, Users } from 'lucide-react'
import { analyticsAPI, AnalyticsSummary } from '@/lib/api'
import AnalyticsChart from '@/components/Admin/Dashboard/AnalyticsChart'
import PopularPackages from '@/components/Admin/Analytics/PopularPackages'
import ConversionFunnel from '@/components/Admin/Analytics/ConversionFunnel'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await analyticsAPI.getSummary(days)
      if (response.success) {
        setAnalytics(response.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const metrics = [
    {
      icon: Users,
      label: 'Total Leads',
      value: analytics?.totalLeads || 0,
      color: 'bg-blue-500',
    },
    {
      icon: Eye,
      label: 'Package Views',
      value: analytics?.packageViews || 0,
      color: 'bg-green-500',
    },
    {
      icon: MousePointerClick,
      label: 'CTA Clicks',
      value: analytics?.ctaClicks || 0,
      color: 'bg-purple-500',
    },
    {
      icon: TrendingUp,
      label: 'Conversion Rate',
      value: `${analytics?.conversionRate.toFixed(2) || 0}%`,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your business performance and insights</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${metric.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</h3>
              <p className="text-gray-600 text-sm">{metric.label}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart data={analytics?.last7Days || []} />
        <ConversionFunnel analytics={analytics} />
      </div>

      <PopularPackages days={days} />
    </div>
  )
}


