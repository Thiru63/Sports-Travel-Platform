'use client'

import { motion } from 'framer-motion'
import { Search, Plane, Sparkles } from 'lucide-react'

const steps = [
  {
    number: '1',
    icon: Search,
    title: 'Choose Your Event',
    description: 'Browse our curated selection of premium sports events worldwide',
  },
  {
    number: '2',
    icon: Plane,
    title: 'We Arrange Your Travel + Tickets',
    description: 'Our team handles all logistics, from flights to event tickets',
  },
  {
    number: '3',
    icon: Sparkles,
    title: 'Enjoy a Seamless Sports Experience',
    description: 'Sit back and enjoy your unforgettable sports travel adventure',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-padding bg-gray-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Getting your dream sports travel experience is simple and straightforward
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-400 to-primary-600 z-0" />
                )}

                <div className="relative z-10 text-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="inline-flex items-center justify-center w-24 h-24 bg-gradient-primary rounded-full mb-6 shadow-lg"
                  >
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {step.number}
                    </div>
                    <Icon size={40} className="text-white" />
                  </motion.div>

                  <h3 className="text-2xl font-bold mb-3 text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}


