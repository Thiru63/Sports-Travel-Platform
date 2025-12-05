'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { leadsAPI, analyticsAPI, eventsAPI } from '@/lib/api'
import { Event } from '@/lib/api'
import toast from 'react-hot-toast'

const leadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  message: z.string().optional(),
  eventId: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedEventId?: string
}

export default function LeadFormModal({ isOpen, onClose, preselectedEventId }: LeadFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  })

  useEffect(() => {
    if (isOpen) {
      fetchEvents()
    }
  }, [isOpen])

  useEffect(() => {
    // Pre-select event if provided
    if (preselectedEventId && isOpen) {
      setValue('eventId', preselectedEventId)
    }
  }, [preselectedEventId, isOpen, setValue])

  const fetchEvents = async () => {
    setIsLoadingEvents(true)
    try {
      const response = await eventsAPI.getAll({ active: 'true', upcoming: 'true' })
      console.log('Events API response in LeadForm:', response)
      if (response.success) {
        setEvents(response.data || [])
      } else {
        console.warn('No events found or invalid response:', response)
        setEvents([])
      }
    } catch (error: any) {
      console.error('Error fetching events:', error)
      console.error('Error details:', error.response?.data || error.message)
      setEvents([])
    } finally {
      setIsLoadingEvents(false)
    }
  }

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true)
    try {
      const submitData: any = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
      }
      
      // Add eventId if selected
      if (data.eventId) {
        submitData.eventId = data.eventId
      }

      await leadsAPI.create(submitData)
      
      // Track analytics
      await analyticsAPI.trackEvent({
        type: 'LEAD_FORM_SUBMIT',
        section: 'hero',
        element: 'lead_form',
        metadata: { eventId: data.eventId },
      })

      toast.success('Thank you! We\'ll contact you soon.')
      reset()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit form')
    } finally {
      setIsSubmitting(false)
    }
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
            className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-bold mb-6">Plan Your Trip</h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Your full name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interested Event (Optional)
                  </label>
                  {isLoadingEvents ? (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <p className="text-gray-500 text-sm">Loading events...</p>
                    </div>
                  ) : (
                    <select
                      {...register('eventId')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select an event...</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  )}
                  {events.length === 0 && !isLoadingEvents && (
                    <p className="text-gray-500 text-sm mt-1">No events available</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (Optional)
                  </label>
                  <textarea
                    {...register('message')}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Tell us about your travel preferences..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}


