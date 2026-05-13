'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, MessageCircle, AlertCircle } from 'lucide-react'

interface ConversationUser {
  id: number
  nickname: string
  avatar: string | null
}

interface ConversationProduct {
  id: number
  title: string
  images: string[]
}

interface ConversationLastMessage {
  id: number
  content: string
  createdAt: string
  senderId: number
}

interface Conversation {
  id: number
  otherUser: ConversationUser
  product: ConversationProduct
  lastMessage: ConversationLastMessage | null
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }
}

export default function MessagesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取会话列表失败')
      }
      const data = await res.json()
      setConversations(data)
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
      fetchConversations()
    }
  }, [status, router, fetchConversations])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" aria-label="加载中" />
        <span className="sr-only">加载中</span>
      </div>
    )
  }

  return (
    <div>
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">消息</h1>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <AlertCircle className="w-16 h-16 mb-4" />
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={fetchConversations}
            className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
          >
            重试
          </button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <MessageCircle className="w-16 h-16 mb-4" />
          <p className="text-sm">暂无消息</p>
          <p className="text-xs mt-1">浏览商品并联系卖家开始聊天</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.otherUser.id}?productId=${conv.product.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {conv.otherUser.avatar ? (
                  <Image
                    src={conv.otherUser.avatar}
                    alt={conv.otherUser.nickname}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg font-medium">
                    {conv.otherUser.nickname.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 truncate">
                    {conv.otherUser.nickname}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {conv.lastMessage ? conv.lastMessage.content : '暂无消息'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  关于: {conv.product.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
