'use client'

import { motion } from 'framer-motion'
import { Edit, Trash2, Image as ImageIcon, DollarSign, Sparkles } from 'lucide-react'
import { AddOn } from '@/lib/api'
import Image from 'next/image'

interface AddonsTableProps {
  addons: AddOn[]
  isLoading: boolean
  onEdit: (addon: AddOn) => void
  onDelete: (id: string) => void
}

export default function AddonsTable({
  addons,
  isLoading,
  onEdit,
  onDelete,
}: AddonsTableProps) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {addons.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No addons found. Create your first addon!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
          {addons.map((addon, index) => (
            <motion.div
              key={addon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="card relative"
            >
              <div className="absolute top-2 right-2 z-10">
                <div className="bg-accent-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                  <Sparkles size={12} />
                  <span>VIP</span>
                </div>
              </div>

              <div className="relative h-48 overflow-hidden">
                {addon.image ? (
                  <Image
                    src={addon.image}
                    alt={addon.title}
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">{addon.title}</h3>
                
                <div className="mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-primary-600" />
                    <span className="font-semibold">{formatPrice(addon.basePrice)}</span>
                  </div>
                  {addon.packageIds.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {addon.packageIds.length} package(s) linked
                    </div>
                  )}
                </div>

                {addon.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{addon.description}</p>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(addon)}
                    className="flex-1 btn-outline text-sm flex items-center justify-center space-x-1"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(addon.id)}
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


