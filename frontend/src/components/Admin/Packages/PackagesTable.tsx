'use client'

import { motion } from 'framer-motion'
import { Edit, Trash2, Image as ImageIcon, MapPin, Calendar, DollarSign } from 'lucide-react'
import { Package } from '@/lib/api'
import Image from 'next/image'

interface PackagesTableProps {
  packages: Package[]
  isLoading: boolean
  onEdit: (pkg: Package) => void
  onDelete: (id: string) => void
}

export default function PackagesTable({
  packages,
  isLoading,
  onEdit,
  onDelete,
}: PackagesTableProps) {
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
      {packages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No packages found. Create your first package!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="card"
            >
              <div className="relative h-48 overflow-hidden">
                {pkg.image ? (
                  <Image
                    src={pkg.image}
                    alt={pkg.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="text-gray-400" size={48} />
                  </div>
                )}
                {pkg.isFeatured && (
                  <div className="absolute top-2 right-2 bg-accent-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Featured
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.title}</h3>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-2 text-primary-600" />
                    <span>{pkg.location}</span>
                  </div>
                  {pkg.eventDate && (
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-primary-600" />
                      <span>{new Date(pkg.eventDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-primary-600" />
                    <span className="font-semibold">{formatPrice(pkg.basePrice)}</span>
                    {pkg.dynamicPrice && (
                      <span className="text-gray-400 line-through ml-2">
                        {formatPrice(pkg.dynamicPrice)}
                      </span>
                    )}
                  </div>
                  {pkg.category && (
                    <div className="inline-block bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs">
                      {pkg.category}
                    </div>
                  )}
                </div>

                {pkg.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(pkg)}
                    className="flex-1 btn-outline text-sm flex items-center justify-center space-x-1"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(pkg.id)}
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


