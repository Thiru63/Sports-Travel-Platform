'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, Calendar, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Lead } from '@/lib/api'
import LeadStatusBadge from './LeadStatusBadge'
import LeadStatusDropdown from './LeadStatusDropdown'
import ChatHistoryModal from './ChatHistoryModal'

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
  const [selectedLeadForChat, setSelectedLeadForChat] = useState<{ id: string; name?: string } | null>(null)

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
    <div className="bg-white rounded-xl shadow-lg overflow-visible">

      {/* Table scroll wrapper — FIXED */}
      <div className="relative overflow-x-auto overflow-visible -mx-4 md:mx-0">
        <table className="w-full min-w-[640px] md:min-w-0">
          
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                
                {/* Lead Info */}
                <td className="px-6 py-4 whitespace-nowrap relative overflow-visible">
                  <div className="font-medium text-gray-900">{lead.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">ID: {lead.id.slice(0, 8)}...</div>

                  {/* Contact for mobile */}
                  <div className="md:hidden mt-1 space-y-1">
                    {lead.email && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Mail size={12} className="mr-1" />
                        {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Phone size={12} className="mr-1" />
                        {lead.phone}
                      </div>
                    )}
                  </div>
                </td>

                {/* Contact (Desktop) */}
                <td className="px-6 py-4 hidden md:table-cell relative overflow-visible">
                  <div className="space-y-1">
                    {lead.email && (
                      <div className="flex items-center text-gray-700 text-sm">
                        <Mail size={14} className="mr-2" />
                        {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-gray-700 text-sm">
                        <Phone size={14} className="mr-2" />
                        {lead.phone}
                      </div>
                    )}
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4 relative overflow-visible">
                  <LeadStatusBadge status={lead.status} />
                </td>

                {/* Score */}
                <td className="px-6 py-4 hidden lg:table-cell relative overflow-visible">
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-900">{lead.leadScore}</span>
                    <span className="text-sm text-gray-500 ml-1">/100</span>
                  </div>
                </td>

                {/* Created */}
                <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-500 relative overflow-visible">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2" />
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                </td>

                {/* Actions — FIXED (relative + overflow-visible) */}
                <td className="px-6 py-4 text-right relative overflow-visible">
                  <div className="flex items-center justify-end space-x-2">

                    {/* Chat Button */}
                    <button
                      onClick={() => setSelectedLeadForChat({ id: lead.id, name: lead.name || lead.email })}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                      title="View chat history"
                    >
                      <MessageCircle size={18} />
                    </button>

                    {/* Status Dropdown — NOW VISIBLE */}
                    <LeadStatusDropdown
                      leadId={lead.id}
                      currentStatus={lead.status}
                      onStatusUpdate={onStatusUpdate}
                      isOpen={openDropdown === lead.id}
                      onToggle={() => setOpenDropdown(openDropdown === lead.id ? null : lead.id)}
                    />

                  </div>
                </td>

              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">Page {currentPage} of {totalPages}</div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* No Leads */}
      {leads.length === 0 && (
        <div className="text-center py-12 text-gray-500">No leads found</div>
      )}

      {/* Chat Modal */}
      <ChatHistoryModal
        isOpen={!!selectedLeadForChat}
        onClose={() => setSelectedLeadForChat(null)}
        leadId={selectedLeadForChat?.id || ''}
        leadName={selectedLeadForChat?.name}
      />
    </div>
  )
}
