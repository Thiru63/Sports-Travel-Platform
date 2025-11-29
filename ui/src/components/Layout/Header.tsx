'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <nav className="container-custom section-padding py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-2xl font-bold text-gradient"
            >
              SPORTS
            </motion.div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-primary-600 transition-colors">
              Home
            </Link>
            <Link href="#ai-assistant" className="text-gray-700 hover:text-primary-600 transition-colors">
              AI Assistant
            </Link>
            <Link href="#packages" className="text-gray-700 hover:text-primary-600 transition-colors">
              Packages
            </Link>
            <Link href="#itineraries" className="text-gray-700 hover:text-primary-600 transition-colors">
              Itineraries
            </Link>
            <Link href="#faq" className="text-gray-700 hover:text-primary-600 transition-colors">
              FAQ
            </Link>
            <Link href="#contact" className="text-gray-700 hover:text-primary-600 transition-colors">
              Contact
            </Link>
            <Link
              href="/admin/login"
              className="btn-outline text-sm"
            >
              Admin
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 space-y-4"
            >
              <Link href="/" className="block text-gray-700 hover:text-primary-600">
                Home
              </Link>
              <Link href="#ai-assistant" className="block text-gray-700 hover:text-primary-600">
                AI Assistant
              </Link>
              <Link href="#packages" className="block text-gray-700 hover:text-primary-600">
                Packages
              </Link>
              <Link href="#itineraries" className="block text-gray-700 hover:text-primary-600">
                Itineraries
              </Link>
              <Link href="#faq" className="block text-gray-700 hover:text-primary-600">
                FAQ
              </Link>
              <Link href="#contact" className="block text-gray-700 hover:text-primary-600">
                Contact
              </Link>
              <Link href="/admin/login" className="block btn-outline text-center">
                Admin
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  )
}


