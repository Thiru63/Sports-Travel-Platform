'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { packagesAPI, eventsAPI, analyticsAPI } from '@/lib/api'
import { Package, Event } from '@/lib/api'
import LeadFormModal from '../Modals/LeadFormModal'
import Image from 'next/image'

export default function TopPackagesSection() {
  const [packages, setPackages] = useState<Package[]>([])
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [showLeadForm, setShowLeadForm] = useState(false)

  // Fetch the first featured event
  useEffect(() => {
    const fetchFeaturedEvent = async () => {
      try {
        const response = await eventsAPI.getAll({ active: 'true', upcoming: 'true' })
        if (response.success && response.data && response.data.length > 0) {
          setCurrentEvent(response.data[0])
        }
      } catch (error) {
        console.error('Error fetching featured event:', error)
      }
    }

    fetchFeaturedEvent()
  }, [])

  // Fetch packages when event changes
  useEffect(() => {
    if (currentEvent) {
      fetchPackages(currentEvent.id)
    }
  }, [currentEvent])

  const fetchPackages = async (eventId: string) => {
    setIsLoading(true)
    try {
      const response = await packagesAPI.getAll({ eventId })
      console.log('Packages API response:', response)
      if (response.success && response.data) {
        // Get top 4 packages
        const topPackages = response.data.slice(0, 4)
        setPackages(topPackages)
      } else {
        console.warn('No packages found or invalid response:', response)
        setPackages([])
      }
    } catch (error: any) {
      console.error('Error fetching packages:', error)
      console.error('Error details:', error.response?.data || error.message)
      setPackages([])
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for event changes from FeaturedEventSection via custom event
  useEffect(() => {
    const handleEventChange = (event: CustomEvent) => {
      if (event.detail && event.detail.eventId) {
        // Fetch packages for the new event
        fetchPackages(event.detail.eventId)
      }
    }

    window.addEventListener('featuredEventChanged', handleEventChange as EventListener)
    return () => {
      window.removeEventListener('featuredEventChanged', handleEventChange as EventListener)
    }
  }, [])

  const handlePackageClick = async (pkg: Package) => {
    await analyticsAPI.trackEvent({
      type: 'PACKAGE_VIEW',
      section: 'top_packages',
      element: 'package_card',
      packageId: pkg.id,
    })
    setSelectedPackage(pkg)
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
      <section id="packages" className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="packages" className="section-padding bg-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Top Packages</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover our most popular sports travel experiences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8 }}
              className="card cursor-pointer group"
              onClick={() => handlePackageClick(pkg)}
            >
              <div className="relative h-48 overflow-hidden">
                {pkg.image ? (
                  <Image
                    src={pkg.image}
                    alt={pkg.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div
                    className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400')",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{pkg.title}</h3>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="mr-2 text-primary-600" size={16} />
                    <span>{pkg.location}</span>
                  </div>
                  {pkg.eventDate && (
                    <div className="flex items-center">
                      <Calendar className="mr-2 text-primary-600" size={16} />
                      <span>
                        {new Date(pkg.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="text-2xl font-bold text-primary-600">
                      {formatPrice(pkg.basePrice)}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">starting</span>
                  </div>
                </div>

                <button className="w-full btn-outline text-sm group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600">
                  View Details
                  <ArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {packages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No packages available at the moment.</p>
          </div>
        )}
      </div>

      <LeadFormModal 
        isOpen={showLeadForm} 
        onClose={() => setShowLeadForm(false)}
        preselectedEventId={selectedPackage?.eventId || currentEvent?.id}
      />
    </section>
  )
}


