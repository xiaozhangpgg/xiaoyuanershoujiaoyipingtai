'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, MessageCircle, User } from 'lucide-react'

const tabs = [
  { href: '/', label: '首页', icon: Home },
  { href: '/publish', label: '发布', icon: Plus },
  { href: '/messages', label: '消息', icon: MessageCircle },
  { href: '/profile', label: '我的', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200" aria-label="主导航">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-green-500' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-0.5">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
