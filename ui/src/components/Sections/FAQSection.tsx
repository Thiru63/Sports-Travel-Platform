'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'What sports events do you cover?',
    answer: 'We cover a wide range of global sports events including Formula 1, Olympics, World Cup, Wimbledon, NBA Finals, and many more premium sporting events worldwide.',
  },
  {
    question: 'How far in advance should I book?',
    answer: 'We recommend booking at least 3-6 months in advance for popular events to secure the best packages and pricing. However, we also offer last-minute deals when available.',
  },
  {
    question: 'What is included in the travel package?',
    answer: 'Our packages typically include event tickets, accommodation, transportation, and sometimes meals. Specific inclusions vary by package - please check individual package details.',
  },
  {
    question: 'Can I customize my package?',
    answer: 'Yes! We offer customizable packages and add-ons. Contact our team or use our AI assistant to discuss your specific requirements and preferences.',
  },
  {
    question: 'What is your cancellation policy?',
    answer: 'Cancellation policies vary by package and event. Generally, cancellations made 60+ days before the event receive a full refund minus processing fees. Please review the specific terms for your chosen package.',
  },
  {
    question: 'Do you provide travel insurance?',
    answer: 'Travel insurance is available as an optional add-on. We highly recommend it to protect your investment, especially for international travel.',
  },
  {
    question: 'How do I get recommendations?',
    answer: 'You can use our AI travel assistant to get personalized recommendations based on your budget, preferred destination, dates, and favorite sports. Simply click the chat icon and start a conversation!',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, bank transfers, and in some cases, payment plans for premium packages. Contact us for more details on payment options.',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="section-padding bg-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about our sports travel packages
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="card"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900 pr-4">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="text-primary-600" size={24} />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-gray-600 leading-relaxed">{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


