'use client'

import { motion } from 'framer-motion'
import { Plus, Package, Map, Bot } from 'lucide-react'
import Link from 'next/link'

const actions = [
  { icon: Plus, label: 'Add New Lead', href: '/admin/leads?action=create', color: 'bg-blue-500' },
  { icon: Package, label: 'Create Package', href: '/admin/packages?action=create', color: 'bg-green-500' },
  { icon: Map, label: 'New Itinerary', href: '/admin/itineraries?action=create', color: 'bg-purple-500' },
  { icon: Bot, label: 'AI Content', href: '/admin/ai', color: 'bg-orange-500' },
]

export default function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-lg"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <motion.button
                whileHover={{ x: 4 }}
                className="w-full flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className={`${action.color} p-2 rounded-lg`}>
                  <Icon className="text-white" size={20} />
                </div>
                <span className="font-medium text-gray-700">{action.label}</span>
              </motion.button>
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}


