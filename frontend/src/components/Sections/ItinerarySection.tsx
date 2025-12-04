'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Calendar, MapPin } from 'lucide-react'
import { itinerariesAPI, analyticsAPI } from '@/lib/api'
import { Itinerary } from '@/lib/api'
import LeadFormModal from '../Modals/LeadFormModal'
import Image from 'next/image'

export default function ItinerarySection() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const response = await itinerariesAPI.getAll()
        if (response.success) {
          setItineraries(response.data)
        }
      } catch (error) {
        console.error('Error fetching itineraries:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchItineraries()
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const handleItineraryClick = async (itinerary: Itinerary) => {
    await analyticsAPI.trackEvent({
      type: 'CTA_CLICK',
      section: 'itineraries',
      element: 'itinerary_card',
      itineraryId: itinerary.id,
    })
    setShowLeadForm(true)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (isLoading) {
    return (
      <section id="itineraries" className="section-padding">
        <div className="container-custom">
          <div className="flex space-x-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-80 animate-pulse">
                <div className="h-64 bg-gray-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="itineraries" className="section-padding bg-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Sample Itinerary</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our carefully crafted travel experiences
          </p>
        </motion.div>

        <div className="relative">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition"
          >
            <ArrowRight size={24} className="text-gray-700" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {itineraries.map((itinerary, index) => (
              <motion.div
                key={itinerary.id}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -8 }}
                className="flex-shrink-0 w-80 card cursor-pointer group"
                onClick={() => handleItineraryClick(itinerary)}
              >
                <div className="relative h-48 overflow-hidden">
                  {itinerary.image ? (
                    <Image
                      src={itinerary.image}
                      alt={itinerary.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                      style={{
                        backgroundImage: "url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400')",
                      }}
                    />
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{itinerary.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{itinerary.description}</p>
                  
                  {itinerary.duration && (
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Calendar className="mr-2" size={16} />
                      <span>{itinerary.duration} days</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary-600">
                      {formatPrice(itinerary.basePrice)}
                    </span>
                    <button className="btn-primary text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {itineraries.length === 0 && (
              <div className="w-full text-center py-12">
                <p className="text-gray-500">No itineraries available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <LeadFormModal isOpen={showLeadForm} onClose={() => setShowLeadForm(false)} />
    </section>
  )
}


