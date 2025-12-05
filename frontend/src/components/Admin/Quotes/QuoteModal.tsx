'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Quote, leadsAPI, eventsAPI, packagesAPI, addonsAPI, itinerariesAPI } from '@/lib/api'
import { Lead, Event, Package, AddOn, Itinerary } from '@/lib/api'
import toast from 'react-hot-toast'

const quoteSchema = z.object({
  leadId: z.string().min(1, 'Lead is required'),
  eventId: z.string().min(1, 'Event is required'),
  packageId: z.string().min(1, 'Package is required'),
  travellers: z.number().min(1, 'At least 1 traveller required'),
  travelDates: z.array(z.string()).length(2, 'Start and end dates required'),
  addonIds: z.array(z.string()).optional(),
  itinerariesIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  finalPrice: z.number().optional(),
})

type QuoteFormData = z.infer<typeof quoteSchema>

interface QuoteModalProps {
  isOpen: boolean
  onClose: () => void
  quote?: Quote | null
  onSave: (data: Partial<Quote>) => void
}

export default function QuoteModal({ isOpen, onClose, quote, onSave }: QuoteModalProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [addons, setAddons] = useState<AddOn[]>([])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      currency: 'USD',
      status: 'SENT',
      addonIds: [],
      itinerariesIds: [],
    },
  })

  const watchedEventId = watch('eventId')

  useEffect(() => {
    if (watchedEventId && watchedEventId !== selectedEventId) {
      setSelectedEventId(watchedEventId)
      fetchPackagesForEvent(watchedEventId)
      fetchAddonsForEvent(watchedEventId)
      fetchItinerariesForEvent(watchedEventId)
    }
  }, [watchedEventId])

  useEffect(() => {
    if (isOpen) {
      fetchLeads()
      fetchEvents()
      if (quote) {
        setSelectedEventId(quote.eventId)
        reset({
          leadId: quote.leadId,
          eventId: quote.eventId,
          packageId: quote.packageId,
          travellers: quote.travellers,
          travelDates: quote.travelDates,
          addonIds: quote.addonIds || [],
          itinerariesIds: quote.itinerariesIds || [],
          notes: quote.notes || '',
          currency: quote.currency || 'USD',
          status: quote.status || 'SENT',
          finalPrice: quote.finalPrice,
        })
        fetchPackagesForEvent(quote.eventId)
        fetchAddonsForEvent(quote.eventId)
        fetchItinerariesForEvent(quote.eventId)
      } else {
        reset({
          leadId: '',
          eventId: '',
          packageId: '',
          travellers: 1,
          travelDates: ['', ''],
          addonIds: [],
          itinerariesIds: [],
          notes: '',
          currency: 'USD',
          status: 'SENT',
        })
        setSelectedEventId('')
      }
    }
  }, [isOpen, quote, reset])

  const fetchLeads = async () => {
    try {
      const response = await leadsAPI.getAll()
      if (response.success) {
        setLeads(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAll({ active: 'true' })
      if (response.success) {
        setEvents(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchPackagesForEvent = async (eventId: string) => {
    try {
      const response = await packagesAPI.getAll({ eventId })
      if (response.success) {
        setPackages(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
    }
  }

  const fetchAddonsForEvent = async (eventId: string) => {
    try {
      const response = await addonsAPI.getAll({ eventId })
      if (response.success) {
        setAddons(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching addons:', error)
    }
  }

  const fetchItinerariesForEvent = async (eventId: string) => {
    try {
      const response = await itinerariesAPI.getAll({ eventId })
      if (response.success) {
        setItineraries(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching itineraries:', error)
    }
  }

  const onSubmit = (data: QuoteFormData) => {
    onSave(data)
  }

  const toggleAddon = (addonId: string) => {
    const currentAddons = watch('addonIds') || []
    if (currentAddons.includes(addonId)) {
      setValue('addonIds', currentAddons.filter(id => id !== addonId))
    } else {
      setValue('addonIds', [...currentAddons, addonId])
    }
  }

  const toggleItinerary = (itineraryId: string) => {
    const currentItineraries = watch('itinerariesIds') || []
    if (currentItineraries.includes(itineraryId)) {
      setValue('itinerariesIds', currentItineraries.filter(id => id !== itineraryId))
    } else {
      setValue('itinerariesIds', [...currentItineraries, itineraryId])
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
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {quote ? 'Edit Quote' : 'Generate Quote'}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead *
                    </label>
                    <select
                      {...register('leadId')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!!quote}
                    >
                      <option value="">Select a lead...</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name || lead.email || lead.id}
                        </option>
                      ))}
                    </select>
                    {errors.leadId && (
                      <p className="text-red-500 text-sm mt-1">{errors.leadId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event *
                    </label>
                    <select
                      {...register('eventId')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!!quote}
                    >
                      <option value="">Select an event...</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                    {errors.eventId && (
                      <p className="text-red-500 text-sm mt-1">{errors.eventId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Package *
                    </label>
                    <select
                      {...register('packageId')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!selectedEventId || !!quote}
                    >
                      <option value="">{selectedEventId ? 'Select a package...' : 'Select an event first...'}</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.title} - ${pkg.basePrice}
                        </option>
                      ))}
                    </select>
                    {errors.packageId && (
                      <p className="text-red-500 text-sm mt-1">{errors.packageId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Travellers *
                    </label>
                    <input
                      type="number"
                      {...register('travellers', { valueAsNumber: true })}
                      min="1"
                      max="50"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {errors.travellers && (
                      <p className="text-red-500 text-sm mt-1">{errors.travellers.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Travel Start Date *
                    </label>
                    <input
                      type="date"
                      {...register('travelDates.0')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Travel End Date *
                    </label>
                    <input
                      type="date"
                      {...register('travelDates.1')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {quote && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          {...register('status')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="SENT">SENT</option>
                          <option value="VIEWED">VIEWED</option>
                          <option value="ACCEPTED">ACCEPTED</option>
                          <option value="EXPIRED">EXPIRED</option>
                          <option value="DECLINED">DECLINED</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Final Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('finalPrice', { valueAsNumber: true })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      {...register('currency')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                </div>

                {selectedEventId && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add-ons (Optional)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {addons.map((addon) => (
                          <label
                            key={addon.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={watch('addonIds')?.includes(addon.id) || false}
                              onChange={() => toggleAddon(addon.id)}
                              className="rounded"
                            />
                            <span className="text-sm">
                              {addon.title} (+${addon.price || addon.basePrice})
                            </span>
                          </label>
                        ))}
                        {addons.length === 0 && (
                          <p className="text-sm text-gray-500 col-span-full">No add-ons available for this event</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Itineraries (Optional)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {itineraries.map((itinerary) => (
                          <label
                            key={itinerary.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={watch('itinerariesIds')?.includes(itinerary.id) || false}
                              onChange={() => toggleItinerary(itinerary.id)}
                              className="rounded"
                            />
                            <span className="text-sm">
                              {itinerary.title} {itinerary.basePrice > 0 && `(+$${itinerary.basePrice})`}
                            </span>
                          </label>
                        ))}
                        {itineraries.length === 0 && (
                          <p className="text-sm text-gray-500 col-span-full">No itineraries available for this event</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional notes about this quote..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {quote ? 'Update Quote' : 'Generate Quote'}
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

