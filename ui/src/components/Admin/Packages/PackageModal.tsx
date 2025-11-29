'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Package } from '@/lib/api'

const packageSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  basePrice: z.number().min(0, 'Price must be positive'),
  dynamicPrice: z.number().optional().nullable(),
  image: z.string().url('Invalid URL').optional().or(z.literal('')),
  location: z.string().min(2, 'Location is required'),
  eventDate: z.string().optional().nullable(),
  isFeatured: z.boolean(),
  category: z.string().optional(),
})

type PackageFormData = z.infer<typeof packageSchema>

interface PackageModalProps {
  isOpen: boolean
  onClose: () => void
  package?: Package | null
  onSave: (data: Partial<Package>) => void
}

export default function PackageModal({ isOpen, onClose, package: pkg, onSave }: PackageModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      isFeatured: false,
    },
  })

  useEffect(() => {
    if (pkg) {
      reset({
        title: pkg.title,
        description: pkg.description || '',
        basePrice: pkg.basePrice,
        dynamicPrice: pkg.dynamicPrice || null,
        image: pkg.image || '',
        location: pkg.location,
        eventDate: pkg.eventDate ? new Date(pkg.eventDate).toISOString().split('T')[0] : '',
        isFeatured: pkg.isFeatured,
        category: pkg.category || '',
      })
    } else {
      reset({
        title: '',
        description: '',
        basePrice: 0,
        dynamicPrice: null,
        image: '',
        location: '',
        eventDate: '',
        isFeatured: false,
        category: '',
      })
    }
  }, [pkg, reset])

  const onSubmit = (data: PackageFormData) => {
    const packageData: Partial<Package> = {
      ...data,
      eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
      dynamicPrice: data.dynamicPrice || undefined,
    }
    onSave(packageData)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {pkg ? 'Edit Package' : 'Create Package'}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Price *
                    </label>
                    <input
                      {...register('basePrice', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {errors.basePrice && (
                      <p className="text-red-500 text-sm mt-1">{errors.basePrice.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dynamic Price (Optional)
                    </label>
                    <input
                      {...register('dynamicPrice', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    {...register('image')}
                    type="url"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  {errors.image && (
                    <p className="text-red-500 text-sm mt-1">{errors.image.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      {...register('location')}
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {errors.location && (
                      <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Date
                    </label>
                    <input
                      {...register('eventDate')}
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      {...register('category')}
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Formula 1, Olympics"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        {...register('isFeatured')}
                        type="checkbox"
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Featured Package</span>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    {pkg ? 'Update Package' : 'Create Package'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}


