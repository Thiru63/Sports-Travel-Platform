'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, Send, Sparkles, MessageCircle, User } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import { useLeadStore } from '@/store/useLeadStore'
import toast from 'react-hot-toast'

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function AIAssistantSection() {
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

  const quickPrompts = [
    { icon: MessageCircle, label: 'Ask About Packages', prompt: 'What sports travel packages do you have?' },
    { icon: Sparkles, label: 'Get Recommendations', prompt: 'Can you recommend the best package for me?' },
    { icon: Bot, label: 'Book a Trip', prompt: 'I want to book a trip' },
  ]

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <section id="ai-assistant" className="section-padding bg-gray-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Bot className="text-primary-600" size={40} />
            <h2 className="text-4xl md:text-5xl font-bold">Sports Travel AI Assistant</h2>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant answers, personalized recommendations, and book your dream sports travel experience
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Quick Actions Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="text-primary-600" size={20} />
                <h3 className="font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="space-y-2">
                {quickPrompts.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-start space-x-3 group"
                    >
                      <Icon size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-xl shadow-lg flex flex-col h-[600px]">
              {/* Header */}
              <div className="bg-gradient-primary text-white p-4 rounded-t-xl flex items-center space-x-2">
                <Bot size={24} />
                <span className="font-semibold">Travel AI Assistant</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <Bot size={48} className="mx-auto mb-4 text-primary-400" />
                    <p className="font-semibold mb-2">Hello! I'm your AI travel assistant.</p>
                    <p className="text-sm mb-4">I can help you with:</p>
                    <ul className="text-sm space-y-1 text-left max-w-md mx-auto">
                      <li>• Browse and learn about our sports travel packages</li>
                      <li>• Get personalized recommendations based on your preferences</li>
                      <li>• Answer questions about events, pricing, and itineraries</li>
                      <li>• Help you book your dream sports travel experience</li>
                    </ul>
                    <p className="text-sm mt-4 text-gray-400">
                      Try asking: "What packages do you have?" or "Recommend a package for me"
                    </p>
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
                      className={`max-w-[80%] rounded-lg p-4 ${
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
                    <div className="bg-white rounded-lg p-4 shadow-md">
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
              <div className="p-4 bg-white border-t rounded-b-xl">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about packages, get recommendations, or book a trip..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

