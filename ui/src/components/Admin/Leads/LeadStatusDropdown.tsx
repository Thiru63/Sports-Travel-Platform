'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical, Check } from 'lucide-react'

interface LeadStatusDropdownProps {
  leadId: string
  currentStatus: string
  onStatusUpdate: (leadId: string, status: string) => void
  isOpen: boolean
  onToggle: () => void
}

const statuses = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
]

export default function LeadStatusDropdown({
  leadId,
  currentStatus,
  onStatusUpdate,
  isOpen,
  onToggle,
}: LeadStatusDropdownProps) {
  const handleStatusChange = (status: string) => {
    onStatusUpdate(leadId, status)
    onToggle()
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-2 hover:bg-gray-100 rounded-lg transition"
      >
        <MoreVertical size={20} className="text-gray-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={onToggle}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20"
            >
              <div className="py-2">
                {statuses.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusChange(status.value)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                      currentStatus === status.value ? 'bg-primary-50' : ''
                    }`}
                  >
                    <span>{status.label}</span>
                    {currentStatus === status.value && (
                      <Check size={16} className="text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}


