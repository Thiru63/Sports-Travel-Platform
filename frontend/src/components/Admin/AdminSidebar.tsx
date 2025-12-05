'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Map, 
  PlusCircle, 
  BarChart3, 
  Bot,
  Settings,
  FileText
} from 'lucide-react'
import { motion } from 'framer-motion'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Leads', href: '/admin/leads' },
  { icon: Package, label: 'Packages', href: '/admin/packages' },
  { icon: Map, label: 'Itineraries', href: '/admin/itineraries' },
  { icon: PlusCircle, label: 'Addons', href: '/admin/addons' },
  { icon: FileText, label: 'Quotes', href: '/admin/quotes' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Bot, label: 'AI Tools', href: '/admin/ai' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full lg:w-64 bg-white border-r border-gray-200 min-h-screen lg:sticky lg:top-0 overflow-y-auto">
      <div className="p-4 lg:p-6">
        <Link href="/admin" className="flex items-center space-x-2 mb-6 lg:mb-8">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg lg:text-xl">S</span>
          </div>
          <span className="text-lg lg:text-xl font-bold text-gray-900">SportsTravel</span>
        </Link>

        <nav className="space-y-1 lg:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname?.startsWith(item.href))
            
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center space-x-2 lg:space-x-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors text-sm lg:text-base ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} className="lg:w-5 lg:h-5" />
                  <span>{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}


