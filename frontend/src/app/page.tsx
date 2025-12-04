'use client'

import { useEffect } from 'react'
import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import HeroSection from '@/components/Hero/HeroSection'
import AIAssistantSection from '@/components/Sections/AIAssistantSection'
import FeaturedEventSection from '@/components/Sections/FeaturedEventSection'
import TopPackagesSection from '@/components/Sections/TopPackagesSection'
import WhyChooseUsSection from '@/components/Sections/WhyChooseUsSection'
import HowItWorksSection from '@/components/Sections/HowItWorksSection'
import ItinerarySection from '@/components/Sections/ItinerarySection'
import AddOnsSection from '@/components/Sections/AddOnsSection'
import FAQSection from '@/components/Sections/FAQSection'
import ContactSection from '@/components/Sections/ContactSection'
import { analyticsAPI } from '@/lib/api'

export default function Home() {
  useEffect(() => {
    // Track page view
    analyticsAPI.trackEvent({
      type: 'PAGE_VIEW',
      page: 'landing',
    })
  }, [])

  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <AIAssistantSection />
      <FeaturedEventSection />
      <TopPackagesSection />
      <WhyChooseUsSection />
      <HowItWorksSection />
      <ItinerarySection />
      <AddOnsSection />
      <FAQSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
