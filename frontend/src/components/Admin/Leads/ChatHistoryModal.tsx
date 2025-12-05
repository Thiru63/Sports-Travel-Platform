'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot, User, MessageCircle } from 'lucide-react'
import { aiAPI } from '@/lib/api'

interface ChatHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  leadName?: string
}

export default function ChatHistoryModal({
  isOpen,
  onClose,
  leadId,
  leadName,
}: ChatHistoryModalProps) {
  const [conversations, setConversations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && leadId) {
      fetchChatHistory()
    }
  }, [isOpen, leadId])

  const fetchChatHistory = async () => {
    setIsLoading(true)
    try {
      const response = await aiAPI.getLeadChatHistory(leadId)
      if (response.success && response.data) {
        setConversations(response.data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="text-primary-600" size={24} />
                  <div>
                    <h2 className="text-2xl font-bold">Chat History</h2>
                    {leadName && (
                      <p className="text-sm text-gray-500">{leadName}</p>
                    )}
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="flex space-x-1 justify-center mb-4">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <p className="text-gray-500">Loading chat history...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No chat history found for this lead</p>
                  </div>
                ) : (
                  conversations.map((conv, idx) => (
                    <div key={conv.id || idx} className="space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-primary-600 text-white rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <User size={16} className="mt-1 flex-shrink-0" />
                            <p className="text-sm whitespace-pre-wrap">{conv.userMessage}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-[80%] bg-white text-gray-800 rounded-lg p-3 shadow-md">
                          <div className="flex items-start space-x-2">
                            <Bot size={16} className="mt-1 flex-shrink-0 text-primary-600" />
                            <p className="text-sm whitespace-pre-wrap">{conv.aiMessage}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 text-center">
                        {new Date(conv.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

