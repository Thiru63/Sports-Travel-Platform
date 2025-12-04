'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { packagesAPI, analyticsAPI } from '@/lib/api'
import { Package } from '@/lib/api'
import LeadFormModal from '../Modals/LeadFormModal'
import Image from 'next/image'

export default function FeaturedEventSection() {
  const [featuredPackage, setFeaturedPackage] = useState<Package | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showLeadForm, setShowLeadForm] = useState(false)

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await packagesAPI.getFeatured()
        if (response.success && response.data.length > 0) {
          setFeaturedPackage(response.data[0])
        } else {
          // Fallback: get first package if no featured
          const allResponse = await packagesAPI.getAll()
          if (allResponse.success && allResponse.data.length > 0) {
            setFeaturedPackage(allResponse.data[0])
          }
        }
      } catch (error) {
        console.error('Error fetching featured package:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeatured()
  }, [])

  const handleCTAClick = async () => {
    await analyticsAPI.trackEvent({
      type: 'CTA_CLICK',
      section: 'featured_event',
      element: 'request_package_button',
      packageId: featuredPackage?.id,
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

  if (!featuredPackage) {
    return null
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBA'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <section id="featured" className="section-padding bg-gray-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="card overflow-hidden"
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="relative h-96 md:h-auto overflow-hidden">
              {featuredPackage.image ? (
                <Image
                  src={featuredPackage.image}
                  alt={featuredPackage.title}
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
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-bold mb-4 text-gray-900"
              >
                {featuredPackage.title.toUpperCase()}
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="space-y-4 mb-6"
              >
                <div className="flex items-center text-gray-600">
                  <MapPin className="mr-2 text-primary-600" size={20} />
                  <span>{featuredPackage.location}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="mr-2 text-primary-600" size={20} />
                  <span>{formatDate(featuredPackage.eventDate || undefined)}</span>
                </div>
                {featuredPackage.description && (
                  <p className="text-gray-700 leading-relaxed">{featuredPackage.description}</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-primary-600">
                    {formatPrice(featuredPackage.basePrice)}
                  </span>
                  {featuredPackage.dynamicPrice && (
                    <span className="text-gray-500 line-through">
                      {formatPrice(featuredPackage.dynamicPrice)}
                    </span>
                  )}
                  <span className="text-gray-600">per person</span>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                onClick={handleCTAClick}
                className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 group"
              >
                <span>Request My Package</span>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      <LeadFormModal isOpen={showLeadForm} onClose={() => setShowLeadForm(false)} />
    </section>
  )
}


