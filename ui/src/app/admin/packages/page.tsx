'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { packagesAPI, Package } from '@/lib/api'
import PackagesTable from '@/components/Admin/Packages/PackagesTable'
import PackageModal from '@/components/Admin/Packages/PackageModal'
import toast from 'react-hot-toast'

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    setIsLoading(true)
    try {
      const response = await packagesAPI.getAll()
      if (response.success) {
        setPackages(response.data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch packages')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedPackage(null)
    setIsModalOpen(true)
  }

  const handleEdit = (pkg: Package) => {
    setSelectedPackage(pkg)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return

    try {
      await packagesAPI.delete(id)
      toast.success('Package deleted successfully')
      fetchPackages()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete package')
    }
  }

  const handleSave = async (packageData: Partial<Package>) => {
    try {
      if (selectedPackage) {
        await packagesAPI.update(selectedPackage.id, packageData)
        toast.success('Package updated successfully')
      } else {
        await packagesAPI.create(packageData)
        toast.success('Package created successfully')
      }
      setIsModalOpen(false)
      setSelectedPackage(null)
      fetchPackages()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package')
    }
  }

  const filteredPackages = packages.filter((pkg) =>
    pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.location.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Packages Management</h1>
          <p className="text-gray-600">Create and manage sports travel packages</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Create Package</span>
        </button>
      </motion.div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Packages Table */}
      <PackagesTable
        packages={filteredPackages}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Package Modal */}
      <PackageModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPackage(null)
        }}
        package={selectedPackage}
        onSave={handleSave}
      />
    </div>
  )
}


