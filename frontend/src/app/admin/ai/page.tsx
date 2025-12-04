'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, Send, Sparkles, FileText, TrendingUp, Lightbulb } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export default function AIToolsPage() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await aiAPI.adminChat(userMessage)
      
      if (response.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', content: response.data.response },
        ])
      } else {
        throw new Error(response.error || 'Failed to get response')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message')
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' },
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
    { icon: FileText, label: 'Generate SEO Title', prompt: 'Give me best SEO title for London Olympic packages' },
    { icon: FileText, label: 'Write Description', prompt: 'Write a compelling description for Formula 1 Japan Grand Prix package' },
    { icon: FileText, label: 'Create Itinerary', prompt: 'Create a detailed 5-day itinerary for Wimbledon package' },
    { icon: TrendingUp, label: 'Analyze Leads', prompt: 'Give me lead summary and suggestions' },
    { icon: Lightbulb, label: 'Get Suggestions', prompt: 'Give me any suggestions you think based on all data analysis' },
  ]

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Admin Assistant</h1>
        <p className="text-gray-600">
          Get AI-powered content generation, lead analysis, and business insights
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
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
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg flex flex-col h-[600px]">
            <div className="bg-gradient-primary text-white p-4 rounded-t-xl flex items-center space-x-2">
              <Bot size={24} />
              <span className="font-semibold">AI Assistant</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <Bot size={48} className="mx-auto mb-4 text-primary-400" />
                  <p className="font-semibold mb-2">Welcome to AI Admin Assistant!</p>
                  <p className="text-sm">I can help you with:</p>
                  <ul className="text-sm mt-2 space-y-1 text-left max-w-md mx-auto">
                    <li>• Generate SEO titles and descriptions</li>
                    <li>• Create itineraries and add-ons</li>
                    <li>• Analyze leads and provide insights</li>
                    <li>• Suggest business improvements</li>
                  </ul>
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
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

            <div className="p-4 bg-white border-t rounded-b-xl">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your business..."
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
        </div>
      </div>
    </div>
  )
}


