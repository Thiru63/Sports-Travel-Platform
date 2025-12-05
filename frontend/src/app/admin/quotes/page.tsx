'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { quotesAPI, Quote } from '@/lib/api'
import QuotesTable from '@/components/Admin/Quotes/QuotesTable'
import QuoteModal from '@/components/Admin/Quotes/QuoteModal'
import toast from 'react-hot-toast'

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    setIsLoading(true)
    try {
      const response = await quotesAPI.getAll()
      console.log('Admin Quotes API response:', response)
      if (response.success) {
        setQuotes(response.data || [])
      } else {
        console.warn('No quotes found or invalid response:', response)
        setQuotes([])
      }
    } catch (error: any) {
      console.error('Error fetching quotes:', error)
      console.error('Error details:', error.response?.data || error.message)
      toast.error(error.response?.data?.error || error.message || 'Failed to fetch quotes')
      setQuotes([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedQuote(null)
    setIsModalOpen(true)
  }

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      await quotesAPI.delete(id)
      toast.success('Quote deleted successfully')
      fetchQuotes()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete quote')
    }
  }

  const handleSave = async (quoteData: Partial<Quote>) => {
    try {
      if (selectedQuote) {
        await quotesAPI.update(selectedQuote.id, quoteData)
        toast.success('Quote updated successfully')
      } else {
        // For creating, we need to use generate endpoint
        if (quoteData.leadId && quoteData.eventId && quoteData.packageId && quoteData.travellers && quoteData.travelDates) {
          await quotesAPI.generate({
            leadId: quoteData.leadId,
            eventId: quoteData.eventId,
            packageId: quoteData.packageId,
            addonIds: quoteData.addonIds,
            itinerariesIds: quoteData.itinerariesIds,
            travellers: quoteData.travellers,
            travelDates: quoteData.travelDates,
            notes: quoteData.notes,
            currency: quoteData.currency || 'USD',
          })
          toast.success('Quote generated successfully')
        } else {
          toast.error('Please fill all required fields')
          return
        }
      }
      setIsModalOpen(false)
      setSelectedQuote(null)
      fetchQuotes()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save quote')
    }
  }

  const filteredQuotes = quotes.filter((quote) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      quote.lead?.name?.toLowerCase().includes(searchLower) ||
      quote.lead?.email?.toLowerCase().includes(searchLower) ||
      quote.event?.title?.toLowerCase().includes(searchLower) ||
      quote.package?.title?.toLowerCase().includes(searchLower) ||
      quote.status.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Quotes Management</h1>
          <p className="text-sm md:text-base text-gray-600">Create and manage quotes for leads</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center justify-center space-x-2 w-full md:w-auto">
          <Plus size={20} />
          <span>Generate Quote</span>
        </button>
      </motion.div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search quotes by lead, event, package, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <QuotesTable
        quotes={filteredQuotes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Quote Modal */}
      <QuoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedQuote(null)
        }}
        quote={selectedQuote}
        onSave={handleSave}
      />
    </div>
  )
}

