'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { eventsAPI, analyticsAPI } from '@/lib/api'
import { Event } from '@/lib/api'
import LeadFormModal from '../Modals/LeadFormModal'
import Image from 'next/image'

export default function FeaturedEventSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showLeadForm, setShowLeadForm] = useState(false)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true)
        const response = await eventsAPI.getAll({ active: 'true', upcoming: 'true' })
        console.log('Events API response:', response)
        if (response.success && response.data && response.data.length > 0) {
          setEvents(response.data)
        } else {
          console.warn('No events found or invalid response:', response)
        }
      } catch (error: any) {
        console.error('Error fetching events:', error)
        console.error('Error details:', error.response?.data || error.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const currentEvent = events[currentIndex] || null

  const nextEvent = () => {
    setCurrentIndex((prev) => {
      const newIndex = (prev + 1) % events.length
      // Dispatch custom event for packages section
      if (events[newIndex]) {
        window.dispatchEvent(new CustomEvent('featuredEventChanged', { 
          detail: { eventId: events[newIndex].id } 
        }))
      }
      return newIndex
    })
  }

  const prevEvent = () => {
    setCurrentIndex((prev) => {
      const newIndex = (prev - 1 + events.length) % events.length
      // Dispatch custom event for packages section
      if (events[newIndex]) {
        window.dispatchEvent(new CustomEvent('featuredEventChanged', { 
          detail: { eventId: events[newIndex].id } 
        }))
      }
      return newIndex
    })
  }

  // Dispatch event when index changes programmatically
  useEffect(() => {
    if (currentEvent) {
      window.dispatchEvent(new CustomEvent('featuredEventChanged', { 
        detail: { eventId: currentEvent.id } 
      }))
    }
  }, [currentEvent])

  const handleCTAClick = async () => {
    await analyticsAPI.trackEvent({
      type: 'CTA_CLICK',
      section: 'featured_event',
      element: 'request_package_button',
      metadata: { eventId: currentEvent?.id },
    })
    setShowLeadForm(true)
  }

  if (isLoading) {
    return (
      <section id="featured" className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </section>
    )
  }

  if (!currentEvent || events.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <section id="featured" className="section-padding bg-gray-50">
      <div className="container-custom">
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="card overflow-hidden"
            >
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image Section */}
                <div className="relative h-96 md:h-auto overflow-hidden">
                  {currentEvent.image ? (
                    <Image
                      src={currentEvent.image}
                      alt={currentEvent.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{
                        backgroundImage: "url('https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800')",
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-accent-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Featured Event
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                    {currentEvent.title.toUpperCase()}
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="mr-2 text-primary-600" size={20} />
                      <span>{currentEvent.location}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="mr-2 text-primary-600" size={20} />
                      <span>
                        {formatDate(currentEvent.startDate)} - {formatDate(currentEvent.endDate)}
                      </span>
                    </div>
                    {currentEvent.description && (
                      <p className="text-gray-700 leading-relaxed">{currentEvent.description}</p>
                    )}
                  </div>

                  <button
                    onClick={handleCTAClick}
                    className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 group"
                  >
                    <span>Request My Package</span>
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          {events.length > 1 && (
            <>
              <button
                onClick={prevEvent}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg transition"
                aria-label="Previous event"
              >
                <ChevronLeft size={24} className="text-gray-700" />
              </button>
              <button
                onClick={nextEvent}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg transition"
                aria-label="Next event"
              >
                <ChevronRight size={24} className="text-gray-700" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {events.length > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              {events.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index)
                    // Dispatch event when clicking dots
                    if (events[index]) {
                      window.dispatchEvent(new CustomEvent('featuredEventChanged', { 
                        detail: { eventId: events[index].id } 
                      }))
                    }
                  }}
                  className={`w-2 h-2 rounded-full transition ${
                    index === currentIndex ? 'bg-primary-600 w-8' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to event ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <LeadFormModal 
        isOpen={showLeadForm} 
        onClose={() => setShowLeadForm(false)}
        preselectedEventId={currentEvent?.id}
      />
    </section>
  )
}


