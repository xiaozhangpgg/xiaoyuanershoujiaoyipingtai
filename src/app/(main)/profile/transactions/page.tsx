'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Check, X, Clock, Loader2, AlertCircle, PackageOpen } from 'lucide-react'

interface TransactionUser {
  id: number
  nickname: string
  avatar: string | null
}

interface TransactionProduct {
  id: number
  title: string
  images: string[]
}

interface Transaction {
  id: number
  price: string | number
  status: string
  createdAt: string
  product: TransactionProduct
  seller: TransactionUser
  buyer: TransactionUser
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待确认', color: 'bg-orange-100 text-orange-700' },
  SELLER_CONFIRMED: { label: '待确认', color: 'bg-orange-100 text-orange-700' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-600' },
}

function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

export default function TransactionsPage() {
  const { status, data: session } = useSession()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState<'bought' | 'sold'>('bought')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchTransactions = useCallback(async (role: 'bought' | 'sold') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/transactions?role=${role}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取交易列表失败')
      }
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      fetchTransactions(activeTab)
    }
  }, [status, activeTab, router, fetchTransactions])

  const handleTabChange = (tab: 'bought' | 'sold') => {
    setActiveTab(tab)
  }

  const handleConfirm = async (transactionId: number, action: 'confirm' | 'cancel') => {
    setActionLoading(transactionId)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失败')
      }

      const updated = await res.json()
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? updated : t))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setActionLoading(null)
    }
  }

  const currentUserId = session?.user?.id ? parseInt(session.user.id, 10) : null

  return (
    <div>
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/profile')}
          aria-label="返回个人中心"
          className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">我的交易</h1>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200">
        <button
          onClick={() => handleTabChange('bought')}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'bought'
              ? 'text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          我买到的
          {activeTab === 'bought' && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('sold')}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'sold'
              ? 'text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          我卖出的
          {activeTab === 'sold' && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20" role="status">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" aria-label="加载中" />
          <span className="sr-only">加载中</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <AlertCircle className="w-16 h-16 mb-4" />
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchTransactions(activeTab)}
            className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
          >
            重试
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <PackageOpen className="w-16 h-16 mb-4" />
          <p className="text-sm">
            {activeTab === 'bought' ? '暂无购买记录' : '暂无出售记录'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {transactions.map((tx) => {
            const statusConfig = STATUS_CONFIG[tx.status] || {
              label: tx.status,
              color: 'bg-gray-100 text-gray-600',
            }
            const otherUser =
              activeTab === 'bought' ? tx.seller : tx.buyer
            const isBuyerPending =
              activeTab === 'bought' &&
              currentUserId === tx.buyer.id &&
              (tx.status === 'PENDING' || tx.status === 'SELLER_CONFIRMED')

            return (
              <div key={tx.id} className="px-4 py-3">
                <div className="flex gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    {tx.product.images?.[0] ? (
                      <Image
                        src={tx.product.images[0]}
                        alt={tx.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <PackageOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {tx.product.title}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusConfig.color}`}
                      >
                        {(tx.status === 'PENDING' || tx.status === 'SELLER_CONFIRMED') && (
                          <Clock className="w-3 h-3" />
                        )}
                        {statusConfig.label}
                      </span>
                    </div>

                    <p className="text-lg font-semibold text-red-500 mt-1">
                      ¥{formatPrice(tx.price)}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative w-5 h-5 rounded-full overflow-hidden bg-gray-200">
                        {otherUser.avatar ? (
                          <Image
                            src={otherUser.avatar}
                            alt={otherUser.nickname}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            {otherUser.nickname.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {activeTab === 'bought' ? '卖家' : '买家'}: {otherUser.nickname}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(tx.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {isBuyerPending && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleConfirm(tx.id, 'confirm')}
                          disabled={actionLoading === tx.id}
                          aria-label="确认交易完成"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-500 rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === tx.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          确认完成
                        </button>
                        <button
                          onClick={() => handleConfirm(tx.id, 'cancel')}
                          disabled={actionLoading === tx.id}
                          aria-label="取消交易"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === tx.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          取消交易
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
