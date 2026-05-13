'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SearchBarProps {
  defaultValue?: string
}

export default function SearchBar({ defaultValue = '' }: SearchBarProps) {
  const router = useRouter()
  const [keyword, setKeyword] = useState(defaultValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = keyword.trim()
    if (trimmed) {
      router.push(`/?keyword=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-white px-4 py-2">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索二手好物..."
          aria-label="搜索商品"
          className="w-full h-9 pl-9 pr-4 rounded-full bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-green-500/30 transition-shadow"
        />
      </form>
    </div>
  )
}
