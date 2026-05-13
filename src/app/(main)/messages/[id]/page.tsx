'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Send, Loader2, AlertCircle, MessageCircle } from 'lucide-react'

interface MessageSender {
  id: number
  nickname: string
  avatar: string | null
}

interface Message {
  id: number
  content: string
  senderId: number
  createdAt: string
  sender: MessageSender
}

interface OtherUser {
  id: number
  nickname: string
  avatar: string | null
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const otherUserId = params.id as string
  const productId = searchParams.get('productId')

  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = session?.user?.id ? parseInt(session.user.id, 10) : null

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchOtherUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${otherUserId}`)
      if (res.ok) {
        const data = await res.json()
        setOtherUser(data)
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
    }
  }, [otherUserId])

  const fetchMessages = useCallback(async () => {
    if (!productId) return
    setError(null)
    try {
      const res = await fetch(`/api/messages?userId=${otherUserId}&productId=${productId}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取消息失败')
      }
      const data = await res.json()
      // API returns messages in desc order, reverse for display
      setMessages(data.reverse())
    } catch {
      setError('加载消息失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [otherUserId, productId, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && otherUserId) {
      fetchOtherUser()
      fetchMessages()
    }
  }, [status, otherUserId, router, fetchOtherUser, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    const content = newMessage.trim()
    if (!content || sending || !productId) return

    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          receiverId: parseInt(otherUserId, 10),
          productId: parseInt(productId, 10),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '发送失败')
      }

      const message = data
      setMessages((prev) => [...prev, message])
      setNewMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!productId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <AlertCircle className="w-16 h-16 mb-4" />
        <p className="text-sm mb-4">缺少商品信息</p>
        <button
          onClick={() => router.push('/messages')}
          className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
        >
          返回消息列表
        </button>
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" aria-label="加载中" />
        <span className="sr-only">加载中</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/messages')}
          aria-label="返回消息列表"
          className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {otherUser?.avatar ? (
            <Image
              src={otherUser.avatar}
              alt={otherUser.nickname}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-medium">
              {otherUser?.nickname?.charAt(0) || '?'}
            </div>
          )}
        </div>

        <h1 className="font-semibold text-gray-900 truncate">
          {otherUser?.nickname || `用户 ${otherUserId}`}
        </h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {error && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <AlertCircle className="w-12 h-12 mb-3" />
            <p className="text-sm mb-3">{error}</p>
            <button
              onClick={fetchMessages}
              className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
            >
              重试
            </button>
          </div>
        )}

        {!error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4" />
            <p className="text-sm">暂无消息</p>
            <p className="text-xs mt-1">发送第一条消息开始聊天</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                  isOwn
                    ? 'bg-green-500 text-white rounded-br-md'
                    : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    isOwn ? 'text-green-100' : 'text-gray-400'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            aria-label="消息内容"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            aria-label="发送消息"
            className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
