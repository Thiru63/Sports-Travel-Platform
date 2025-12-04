'use client'

import { motion } from 'framer-motion'
import { Settings as SettingsIcon, User, Bell, Shield } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <User className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          </div>
          <p className="text-gray-500">Profile settings coming soon...</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          <p className="text-gray-500">Notification settings coming soon...</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Security</h2>
          </div>
          <p className="text-gray-500">Security settings coming soon...</p>
        </motion.div>
      </div>
    </div>
  )
}


