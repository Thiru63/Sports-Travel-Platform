'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Itinerary } from '@/lib/api'

const itinerarySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  basePrice: z.number().min(0, 'Price must be positive'),
  image: z.string().url('Invalid URL').optional().or(z.literal('')),
  duration: z.number().min(1, 'Duration must be at least 1 day').optional().nullable(),
  packageIds: z.array(z.string()).default([]),
})

type ItineraryFormData = z.infer<typeof itinerarySchema>

interface ItineraryModalProps {
  isOpen: boolean
  onClose: () => void
  itinerary?: Itinerary | null
  onSave: (data: Partial<Itinerary>) => void
}

export default function ItineraryModal({
  isOpen,
  onClose,
  itinerary,
  onSave,
}: ItineraryModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ItineraryFormData>({
    resolver: zodResolver(itinerarySchema),
  })

  useEffect(() => {
    if (itinerary) {
      reset({
        title: itinerary.title,
        description: itinerary.description,
        basePrice: itinerary.basePrice,
        image: itinerary.image || '',
        duration: itinerary.duration || null,
        packageIds: itinerary.packageIds || [],
      })
    } else {
      reset({
        title: '',
        description: '',
        basePrice: 0,
        image: '',
        duration: null,
        packageIds: [],
      })
    }
  }, [itinerary, reset])

  const onSubmit = (data: ItineraryFormData) => {
    onSave(data)
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
                  {itinerary ? 'Edit Itinerary' : 'Create Itinerary'}
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
                    Description *
                  </label>
                  <textarea
                    {...register('description')}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                  )}
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
                      Duration (days)
                    </label>
                    <input
                      {...register('duration', { valueAsNumber: true })}
                      type="number"
                      min="1"
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

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {itinerary ? 'Update Itinerary' : 'Create Itinerary'}
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


