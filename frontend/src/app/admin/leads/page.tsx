'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Download } from 'lucide-react'
import { leadsAPI, Lead } from '@/lib/api'
import LeadsTable from '@/components/Admin/Leads/LeadsTable'
import LeadStatusFilter from '@/components/Admin/Leads/LeadStatusFilter'
import toast from 'react-hot-toast'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, currentPage, searchQuery])

  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const response = await leadsAPI.getAll({
        status: statusFilter,
        search: searchQuery || undefined,
        page: currentPage,
        limit: 10,
      })
      console.log('Admin Leads API response:', response)
      if (response.success) {
        setLeads(response.data || [])
        setTotalPages(response.pagination?.pages || 1)
      } else {
        console.warn('No leads found or invalid response:', response)
        setLeads([])
        setTotalPages(1)
      }
    } catch (error: any) {
      console.error('Error fetching leads:', error)
      console.error('Error details:', error.response?.data || error.message)
      toast.error(error.response?.data?.error || error.message || 'Failed to fetch leads')
      setLeads([])
      setTotalPages(1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await leadsAPI.export({
        status: statusFilter,
        search: searchQuery || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Leads exported successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to export leads')
    }
  }

  const handleStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      await leadsAPI.updateStatus(leadId, newStatus)
      toast.success('Lead status updated')
      fetchLeads()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Leads Management</h1>
          <p className="text-sm md:text-base text-gray-600">View and manage all your leads</p>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center justify-center space-x-2 w-full md:w-auto"
        >
          <Download size={20} />
          <span>Export CSV</span>
        </button>
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <LeadStatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Leads Table */}
      <LeadsTable
        leads={leads}
        isLoading={isLoading}
        onStatusUpdate={handleStatusUpdate}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}


