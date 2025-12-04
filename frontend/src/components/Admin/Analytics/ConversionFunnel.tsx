'use client'

import { motion } from 'framer-motion'
import { AnalyticsSummary } from '@/lib/api'

interface ConversionFunnelProps {
  analytics: AnalyticsSummary | null
}

export default function ConversionFunnel({ analytics }: ConversionFunnelProps) {
  if (!analytics) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Conversion Funnel</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    )
  }

  const totalVisitors = analytics.packageViews + analytics.ctaClicks
  const leads = analytics.totalLeads
  const orders = analytics.totalOrders

  const funnelSteps = [
    { label: 'Visitors', value: totalVisitors, color: 'bg-blue-500' },
    { label: 'Leads', value: leads, color: 'bg-green-500' },
    { label: 'Orders', value: orders, color: 'bg-purple-500' },
  ]

  const maxValue = Math.max(...funnelSteps.map((step) => step.value), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6">Conversion Funnel</h3>
      <div className="space-y-4">
        {funnelSteps.map((step, index) => {
          const percentage = (step.value / maxValue) * 100
          const conversionRate =
            index > 0
              ? ((step.value / funnelSteps[index - 1].value) * 100).toFixed(1)
              : '100'

          return (
            <div key={step.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{step.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900">{step.value}</span>
                  {index > 0 && (
                    <span className="text-xs text-gray-500">({conversionRate}%)</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                  className={`${step.color} h-full flex items-center justify-end pr-2`}
                >
                  {percentage > 10 && (
                    <span className="text-white text-xs font-semibold">{step.value}</span>
                  )}
                </motion.div>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}


