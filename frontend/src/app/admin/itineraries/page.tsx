'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { itinerariesAPI, Itinerary } from '@/lib/api'
import ItinerariesTable from '@/components/Admin/Itineraries/ItinerariesTable'
import ItineraryModal from '@/components/Admin/Itineraries/ItineraryModal'
import toast from 'react-hot-toast'

export default function ItinerariesPage() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null)

  useEffect(() => {
    fetchItineraries()
  }, [])

  const fetchItineraries = async () => {
    setIsLoading(true)
    try {
      const response = await itinerariesAPI.getAll()
      console.log('Admin Itineraries API response:', response)
      if (response.success) {
        setItineraries(response.data || [])
      } else {
        console.warn('No itineraries found or invalid response:', response)
        setItineraries([])
      }
    } catch (error: any) {
      console.error('Error fetching itineraries:', error)
      console.error('Error details:', error.response?.data || error.message)
      toast.error(error.response?.data?.error || error.message || 'Failed to fetch itineraries')
      setItineraries([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedItinerary(null)
    setIsModalOpen(true)
  }

  const handleEdit = (itinerary: Itinerary) => {
    setSelectedItinerary(itinerary)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this itinerary?')) return

    try {
      await itinerariesAPI.delete(id)
      toast.success('Itinerary deleted successfully')
      fetchItineraries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete itinerary')
    }
  }

  const handleSave = async (itineraryData: Partial<Itinerary>) => {
    try {
      if (selectedItinerary) {
        await itinerariesAPI.update(selectedItinerary.id, itineraryData)
        toast.success('Itinerary updated successfully')
      } else {
        await itinerariesAPI.create(itineraryData)
        toast.success('Itinerary created successfully')
      }
      setIsModalOpen(false)
      setSelectedItinerary(null)
      fetchItineraries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save itinerary')
    }
  }

  const filteredItineraries = itineraries.filter((itinerary) =>
    itinerary.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Itineraries Management</h1>
          <p className="text-sm md:text-base text-gray-600">Create and manage travel itineraries</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center justify-center space-x-2 w-full md:w-auto">
          <Plus size={20} />
          <span>Create Itinerary</span>
        </button>
      </motion.div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search itineraries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <ItinerariesTable
        itineraries={filteredItineraries}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ItineraryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedItinerary(null)
        }}
        itinerary={selectedItinerary}
        onSave={handleSave}
      />
    </div>
  )
}


