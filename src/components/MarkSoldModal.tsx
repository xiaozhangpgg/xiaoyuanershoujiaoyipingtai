'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Search, Loader2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Buyer {
  id: number
  nickname: string
  studentId: string
  avatar: string | null
}

interface MarkSoldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: number
  productPrice: number
  onSuccess: () => void
}

export default function MarkSoldModal({
  open,
  onOpenChange,
  productId,
  productPrice,
  onSuccess,
}: MarkSoldModalProps) {
  const [keyword, setKeyword] = useState('')
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)
  const [price, setPrice] = useState(String(productPrice))
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setKeyword('')
      setBuyers([])
      setSelectedBuyer(null)
      setPrice(String(productPrice))
      setError(null)
    }
  }, [open, productPrice])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open || buyers.length === 0 || selectedBuyer) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBuyers([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, buyers.length, selectedBuyer])

  const searchBuyers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setBuyers([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/users/search?keyword=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setBuyers(data)
      } else {
        setBuyers([])
      }
    } catch {
      setBuyers([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && buyers.length > 0) {
      setBuyers([])
    }
  }

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    setSelectedBuyer(null)
    setError(null)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      searchBuyers(value)
    }, 300)
  }

  const handleSelectBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer)
    setKeyword(buyer.nickname)
    setBuyers([])
  }

  const handleSubmit = async () => {
    setError(null)

    if (!selectedBuyer) {
      setError('请选择买家')
      return
    }
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('请输入有效的成交价格')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          buyerId: selectedBuyer.id,
          price: parsedPrice,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失败')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>标记已售</DialogTitle>
          <DialogDescription>
            选择买家并填写成交价格，确认后商品将标记为已售出。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Buyer Search */}
          <div className="relative">
            <label htmlFor="buyer-search" className="block text-sm font-medium text-gray-700 mb-1">
              搜索买家
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="buyer-search"
                type="text"
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="输入昵称或学号搜索"
                aria-autocomplete="list"
                aria-expanded={buyers.length > 0 && !selectedBuyer}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {buyers.length > 0 && !selectedBuyer && (
              <div ref={dropdownRef} role="listbox" className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {buyers.map((buyer) => (
                  <button
                    key={buyer.id}
                    type="button"
                    onClick={() => handleSelectBuyer(buyer)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="relative w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                      {buyer.avatar ? (
                        <Image
                          src={buyer.avatar}
                          alt={buyer.nickname}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs font-medium">
                          {buyer.nickname.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {buyer.nickname}
                      </p>
                      <p className="text-xs text-gray-400">
                        学号 {buyer.studentId}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected buyer indicator */}
            {selectedBuyer && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>已选择: {selectedBuyer.nickname}</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <label htmlFor="transaction-price" className="block text-sm font-medium text-gray-700 mb-1">
              成交价格 (元)
            </label>
            <input
              id="transaction-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0.01"
              max="99999999.99"
              step="0.01"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
            />
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedBuyer}
            className="w-full h-10 bg-green-500 text-white text-sm font-medium rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中...
              </>
            ) : (
              '确认交易'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
