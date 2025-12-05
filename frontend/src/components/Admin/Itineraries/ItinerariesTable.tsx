'use client'

import { motion } from 'framer-motion'
import { Edit, Trash2, Image as ImageIcon, Calendar, DollarSign } from 'lucide-react'
import { Itinerary } from '@/lib/api'
import Image from 'next/image'

interface ItinerariesTableProps {
  itineraries: Itinerary[]
  isLoading: boolean
  onEdit: (itinerary: Itinerary) => void
  onDelete: (id: string) => void
}

export default function ItinerariesTable({
  itineraries,
  isLoading,
  onEdit,
  onDelete,
}: ItinerariesTableProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {itineraries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No itineraries found. Create your first itinerary!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {itineraries.map((itinerary, index) => (
            <motion.div
              key={itinerary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="card"
            >
              <div className="relative h-48 overflow-hidden">
                {itinerary.image ? (
                  <Image
                    src={itinerary.image}
                    alt={itinerary.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="text-gray-400" size={48} />
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{itinerary.title}</h3>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {itinerary.duration && (
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-primary-600" />
                      <span>{itinerary.duration} days</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-primary-600" />
                    <span className="font-semibold">{formatPrice(itinerary.basePrice)}</span>
                  </div>
                  {itinerary.packageIds && itinerary.packageIds.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {itinerary.packageIds.length} package(s) linked
                    </div>
                  )}
                </div>

                {itinerary.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{itinerary.description}</p>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(itinerary)}
                    className="flex-1 btn-outline text-sm flex items-center justify-center space-x-1"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(itinerary.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}


