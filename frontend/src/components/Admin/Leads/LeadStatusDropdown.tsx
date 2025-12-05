'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical, Check } from 'lucide-react'
import { createPortal } from 'react-dom'

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
  { value: 'QUOTE_SENT', label: 'Quote Sent' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
]

export default function LeadStatusDropdown({
  leadId,
  currentStatus,
  onStatusUpdate,
  isOpen,
  onToggle,
}: LeadStatusDropdownProps) {

  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Position dropdown near the button
  useEffect(() => {
    if (isOpen && btnRef.current && dropdownRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      dropdownRef.current.style.top = `${rect.bottom + 6}px`
      dropdownRef.current.style.left = `${rect.right - 190}px`
    }
  }, [isOpen])

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[999]"
            onClick={onToggle}
          />

          {/* Dropdown */}
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
          >
            <div className="py-2">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    onStatusUpdate(leadId, status.value)
                    onToggle()
                  }}
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
  )

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className="p-2 hover:bg-gray-100 rounded-lg transition"
      >
        <MoreVertical size={20} className="text-gray-600" />
      </button>

      {typeof window !== 'undefined' &&
        createPortal(dropdownContent, document.body)}
    </>
  )
}
