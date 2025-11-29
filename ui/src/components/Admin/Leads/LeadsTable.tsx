'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Lead } from '@/lib/api'
import LeadStatusBadge from './LeadStatusBadge'
import LeadStatusDropdown from './LeadStatusDropdown'

interface LeadsTableProps {
  leads: Lead[]
  isLoading: boolean
  onStatusUpdate: (leadId: string, status: string) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function LeadsTable({
  leads,
  isLoading,
  onStatusUpdate,
  currentPage,
  totalPages,
  onPageChange,
}: LeadsTableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead, index) => (
              <motion.tr
                key={lead.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{lead.name || 'Unknown'}</div>
                  <div className="text-sm text-gray-500">ID: {lead.id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {lead.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail size={14} className="mr-2" />
                        {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone size={14} className="mr-2" />
                        {lead.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-900">{lead.leadScore}</span>
                    <span className="text-sm text-gray-500 ml-1">/100</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2" />
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                  <LeadStatusDropdown
                    leadId={lead.id}
                    currentStatus={lead.status}
                    onStatusUpdate={onStatusUpdate}
                    isOpen={openDropdown === lead.id}
                    onToggle={() => setOpenDropdown(openDropdown === lead.id ? null : lead.id)}
                  />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No leads found
        </div>
      )}
    </div>
  )
}


