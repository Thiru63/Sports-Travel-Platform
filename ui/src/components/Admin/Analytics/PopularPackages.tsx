'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { analyticsAPI, Package } from '@/lib/api'

interface PopularPackagesProps {
  days: number
}

interface PopularPackage {
  package: Package
  views: number
}

export default function PopularPackages({ days }: PopularPackagesProps) {
  const [packages, setPackages] = useState<PopularPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPopular = async () => {
      setIsLoading(true)
      try {
        const response = await analyticsAPI.getPopularPackages(days)
        if (response.success) {
          setPackages(response.data)
        }
      } catch (error) {
        console.error('Error fetching popular packages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPopular()
  }, [days])

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <TrendingUp className="text-primary-600" size={24} />
        <h3 className="text-xl font-bold text-gray-900">Popular Packages</h3>
      </div>

      <div className="space-y-4">
        {packages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No package views yet</p>
        ) : (
          packages.map((item, index) => (
            <motion.div
              key={item.package.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.package.title}</h4>
                <p className="text-sm text-gray-600">{item.package.location}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">{item.views}</div>
                  <div className="text-xs text-gray-500">views</div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}


