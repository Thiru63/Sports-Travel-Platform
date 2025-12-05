'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { addonsAPI, analyticsAPI } from '@/lib/api'
import { AddOn } from '@/lib/api'
import LeadFormModal from '../Modals/LeadFormModal'
import Image from 'next/image'

export default function AddOnsSection() {
  const [addons, setAddons] = useState<AddOn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [selectedAddon, setSelectedAddon] = useState<AddOn | null>(null)

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setIsLoading(true)
        // Fetch addons - can optionally filter by eventId
        const response = await addonsAPI.getAll()
        console.log('Addons API response:', response)
        if (response.success) {
          setAddons(response.data || [])
        } else {
          console.warn('No addons found or invalid response:', response)
          setAddons([])
        }
      } catch (error: any) {
        console.error('Error fetching addons:', error)
        console.error('Error details:', error.response?.data || error.message)
        setAddons([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddons()
  }, [])

  const handleAddonClick = async (addon: AddOn) => {
    await analyticsAPI.trackEvent({
      type: 'CTA_CLICK',
      section: 'addons',
      element: 'addon_card',
    })
    setSelectedAddon(addon)
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
      <section id="addons" className="section-padding bg-gray-50">
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
    <section id="addons" className="section-padding bg-gray-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Add-ons & VIP Experiences</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enhance your sports travel experience with premium upgrades
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {addons.map((addon, index) => (
            <motion.div
              key={addon.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="card cursor-pointer group relative overflow-hidden"
              onClick={() => handleAddonClick(addon)}
            >
              {/* VIP Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-accent-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
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
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div
                    className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=400')",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{addon.title}</h3>
                {addon.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{addon.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary-600">
                    {formatPrice(addon.price || addon.basePrice)}
                  </span>
                  <ArrowRight className="text-primary-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {addons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No add-ons available at the moment.</p>
          </div>
        )}
      </div>

      <LeadFormModal 
        isOpen={showLeadForm} 
        onClose={() => {
          setShowLeadForm(false)
          setSelectedAddon(null)
        }}
        preselectedEventId={selectedAddon?.eventId}
      />
    </section>
  )
}


