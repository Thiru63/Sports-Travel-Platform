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
  Settings
} from 'lucide-react'
import { motion } from 'framer-motion'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Leads', href: '/admin/leads' },
  { icon: Package, label: 'Packages', href: '/admin/packages' },
  { icon: Map, label: 'Itineraries', href: '/admin/itineraries' },
  { icon: PlusCircle, label: 'Addons', href: '/admin/addons' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Bot, label: 'AI Tools', href: '/admin/ai' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
      <div className="p-6">
        <Link href="/admin" className="flex items-center space-x-2 mb-8">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-xl font-bold text-gray-900">SportsTravel</span>
        </Link>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname?.startsWith(item.href))
            
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
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


