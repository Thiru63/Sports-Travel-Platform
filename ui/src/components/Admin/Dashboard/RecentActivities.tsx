'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Package, User, Bot, Clock } from 'lucide-react'

const activities = [
  { icon: User, text: "New lead 'Alice Wonderland' registered", time: '2 hours ago', color: 'text-blue-500' },
  { icon: Package, text: "Package 'Tropical Escape' updated", time: '4 hours ago', color: 'text-green-500' },
  { icon: User, text: "Lead 'Bob The Builder' status changed to Contacted", time: '1 day ago', color: 'text-purple-500' },
  { icon: Package, text: "New itinerary 'Maldives Honeymoon' created", time: '1 day ago', color: 'text-orange-500' },
  { icon: User, text: 'Admin User logged in from IP 192.168.1.10', time: '2 days ago', color: 'text-gray-500' },
]

export default function RecentActivities() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-lg"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activities</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className={`${activity.color} p-2 rounded-lg`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">{activity.text}</p>
                <p className="text-gray-500 text-sm mt-1 flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{activity.time}</span>
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}


