'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { addonsAPI, AddOn } from '@/lib/api'
import AddonsTable from '@/components/Admin/Addons/AddonsTable'
import AddonModal from '@/components/Admin/Addons/AddonModal'
import toast from 'react-hot-toast'

export default function AddonsPage() {
  const [addons, setAddons] = useState<AddOn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAddon, setSelectedAddon] = useState<AddOn | null>(null)

  useEffect(() => {
    fetchAddons()
  }, [])

  const fetchAddons = async () => {
    setIsLoading(true)
    try {
      const response = await addonsAPI.getAll()
      console.log('Admin Addons API response:', response)
      if (response.success) {
        setAddons(response.data || [])
      } else {
        console.warn('No addons found or invalid response:', response)
        setAddons([])
      }
    } catch (error: any) {
      console.error('Error fetching addons:', error)
      console.error('Error details:', error.response?.data || error.message)
      toast.error(error.response?.data?.error || error.message || 'Failed to fetch addons')
      setAddons([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedAddon(null)
    setIsModalOpen(true)
  }

  const handleEdit = (addon: AddOn) => {
    setSelectedAddon(addon)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this addon?')) return

    try {
      await addonsAPI.delete(id)
      toast.success('Addon deleted successfully')
      fetchAddons()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete addon')
    }
  }

  const handleSave = async (addonData: Partial<AddOn>) => {
    try {
      if (selectedAddon) {
        await addonsAPI.update(selectedAddon.id, addonData)
        toast.success('Addon updated successfully')
      } else {
        await addonsAPI.create(addonData)
        toast.success('Addon created successfully')
      }
      setIsModalOpen(false)
      setSelectedAddon(null)
      fetchAddons()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save addon')
    }
  }

  const filteredAddons = addons.filter((addon) =>
    addon.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Addons Management</h1>
          <p className="text-sm md:text-base text-gray-600">Create and manage VIP add-ons and experiences</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center justify-center space-x-2 w-full md:w-auto">
          <Plus size={20} />
          <span>Create Addon</span>
        </button>
      </motion.div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search addons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <AddonsTable
        addons={filteredAddons}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AddonModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedAddon(null)
        }}
        addon={selectedAddon}
        onSave={handleSave}
      />
    </div>
  )
}


