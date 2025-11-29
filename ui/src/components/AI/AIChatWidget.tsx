'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import { useLeadStore } from '@/store/useLeadStore'
import toast from 'react-hot-toast'

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { currentLead, updateLead } = useLeadStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }])
    setIsLoading(true)

    try {
      const response = await aiAPI.chat(userMessage)
      
      if (response.success) {
        const aiMessage = response.data.message
        
        // Update lead if contact info was extracted
        if (response.data.extraction?.contact_info) {
          updateLead(response.data.extraction.contact_info)
        }

        // Update lead if provided
        if (response.data.lead) {
          updateLead(response.data.lead)
        }

        setMessages((prev) => [...prev, { role: 'ai', content: aiMessage, timestamp: new Date() }])
      } else {
        throw new Error(response.error || 'Failed to get response')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message')
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-primary text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot size={20} />
                <span className="font-semibold">Travel AI Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <Bot size={48} className="mx-auto mb-4 text-primary-400" />
                  <p>Hello! I'm your AI travel assistant.</p>
                  <p className="text-sm mt-2">Ask me about packages, get recommendations, or book a trip!</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-800 shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {msg.role === 'ai' && <Bot size={16} className="mt-1 flex-shrink-0" />}
                      {msg.role === 'user' && <User size={16} className="mt-1 flex-shrink-0" />}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg p-3 shadow-md">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}


