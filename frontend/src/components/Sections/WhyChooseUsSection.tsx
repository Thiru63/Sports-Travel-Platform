'use client'

import { motion } from 'framer-motion'
import { Shield, Globe, Award, Users, Clock, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: Globe,
    number: '100+',
    title: 'Global Events',
    description: 'Access to premium sports events worldwide',
  },
  {
    icon: Users,
    number: '15+',
    title: 'Years Experience',
    description: 'Trusted by thousands of sports enthusiasts',
  },
  {
    icon: Award,
    number: '2,000+',
    title: 'Happy Travelers',
    description: 'Satisfied customers who trust our services',
  },
  {
    icon: Shield,
    number: '98%',
    title: 'Satisfaction Rate',
    description: 'Consistently high customer satisfaction',
  },
  {
    icon: Clock,
    number: '24/7',
    title: 'Support',
    description: 'Round-the-clock customer assistance',
  },
  {
    icon: TrendingUp,
    number: '4.5%',
    title: 'Conversion Rate',
    description: 'Industry-leading conversion performance',
  },
]

export default function WhyChooseUsSection() {
  return (
    <section id="why-choose-us" className="section-padding bg-gradient-primary text-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Us</h2>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            We deliver exceptional sports travel experiences with unmatched service
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                  <Icon size={32} className="text-white" />
                </div>
                <div className="text-4xl font-bold mb-2 text-accent-400">{feature.number}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-primary-100">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}


