'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MapPin,
  Clock,
  Tag,
  BadgeCheck,
  Loader2,
  AlertCircle,
  PackageOpen,
} from 'lucide-react'
import { conditionLabels } from '@/types'
import { ProductCondition, ProductStatus, TransactionStatus } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Seller {
  id: number
  nickname: string
  avatar: string | null
  verified: boolean
  studentId: string
}

interface Category {
  id: number
  name: string
}

interface ProductDetail {
  id: number
  title: string
  description: string
  price: string
  images: string[]
  condition: ProductCondition
  location: string
  status: ProductStatus
  createdAt: string
  sellerId: number
  seller: Seller
  category: Category
}

interface TransactionInfo {
  id: number
  status: TransactionStatus
  buyerId: number
  sellerId: number
  price: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 30) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState(0)
  const [favorited, setFavorited] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null)
  const [showDelistDialog, setShowDelistDialog] = useState(false)
  const [delisting, setDelisting] = useState(false)
  const [showBuyDialog, setShowBuyDialog] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const productId = params.id as string

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('商品不存在')
        } else {
          setError('加载失败，请重试')
        }
        return
      }
      const data = await res.json()
      setProduct(data)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  // Check favorite status
  useEffect(() => {
    if (!session?.user?.id || !productId) return
    fetch(`/api/favorites/check?productId=${productId}`)
      .then((res) => res.json())
      .then((data) => setFavorited(data.favorited))
      .catch(() => {})
  }, [session?.user?.id, productId])

  // Fetch transaction info when product is SOLD
  useEffect(() => {
    if (!session?.user?.id || !product || product.status !== ProductStatus.SOLD) {
      setTransaction(null)
      return
    }
    fetch(`/api/transactions?productId=${product.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.transactions && data.transactions.length > 0) {
          setTransaction(data.transactions[0])
        }
      })
      .catch(() => {})
  }, [session?.user?.id, product])

  const handleDelist = async () => {
    if (!product) return
    setDelisting(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'PATCH' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '下架失败')
        return
      }
      setShowDelistDialog(false)
      fetchProduct()
    } catch {
      alert('网络错误，请重试')
    } finally {
      setDelisting(false)
    }
  }

  const handleBuy = async () => {
    if (!product) return
    setBuying(true)
    setBuyError('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setBuyError(data.error || '交易失败')
        setBuying(false)
        return
      }
      setShowBuyDialog(false)
      fetchProduct()
    } catch {
      setBuyError('网络错误，请重试')
      setBuying(false)
    }
  }

  const handleCancelTransaction = async () => {
    if (!transaction) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '取消失败')
        return
      }
      setShowCancelDialog(false)
      fetchProduct()
    } catch {
      alert('网络错误，请重试')
    } finally {
      setCancelling(false)
    }
  }

  const toggleFavorite = async () => {
    if (togglingFav) return
    setTogglingFav(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: Number(productId) }),
      })
      if (res.ok) {
        const data = await res.json()
        setFavorited(data.favorited)
      }
    } catch {
      // ignore
    } finally {
      setTogglingFav(false)
    }
  }

  const isSeller = !!session?.user?.id && !!product && product.sellerId === Number(session.user.id)
  const parsedPrice = product ? parseFloat(product.price) : 0
  const displayPrice = isNaN(parsedPrice) ? 0 : parsedPrice

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="加载中">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 px-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <p className="text-sm mb-4">{error || '商品不存在'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
        >
          返回
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-11">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">商品详情</span>
          <div className="w-8" />
        </div>
      </div>

      {/* Image Carousel */}
      <div className="relative bg-gray-100">
        {product.images.length > 0 ? (
          <div className="relative aspect-square">
            <Image
              src={product.images[currentImage]}
              alt={product.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {product.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {product.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className="p-1"
                    aria-label={`查看第${idx + 1}张图片`}
                  >
                    <span className={`block w-2 h-2 rounded-full transition-colors ${
                      idx === currentImage ? 'bg-white' : 'bg-white/50'
                    }`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center aspect-square text-gray-300">
            <PackageOpen className="w-20 h-20" />
          </div>
        )}

        {/* Sold overlay */}
        {product.status === ProductStatus.SOLD && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-2xl font-bold -rotate-12 border-2 border-white px-4 py-1 rounded-lg">
              已售出
            </span>
          </div>
        )}

        {/* Off-shelf overlay */}
        {product.status === ProductStatus.OFF_SHELF && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-2xl font-bold -rotate-12 border-2 border-white px-4 py-1 rounded-lg">
              已下架
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-red-500 font-bold text-xl">
            ¥{displayPrice.toFixed(2)}
          </span>
          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
            {conditionLabels[product.condition]}
          </span>
        </div>
        <h1 className="text-base font-medium text-gray-900 leading-snug">
          {product.title}
        </h1>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {product.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(product.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            {product.category.name}
          </span>
        </div>
      </div>

      {/* Seller Info */}
      <div className="bg-white px-4 py-3 mt-2">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
            {product.seller.avatar ? (
              <Image
                src={product.seller.avatar}
                alt={product.seller.nickname}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">
                {product.seller.nickname.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 truncate">
                {product.seller.nickname}
              </span>
              {product.seller.verified && (
                <BadgeCheck className="w-4 h-4 text-green-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-400">
              学号 {product.seller.studentId}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white px-4 py-3 mt-2">
        <h2 className="text-sm font-medium text-gray-900 mb-2">商品描述</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {product.description}
        </p>
      </div>

      {/* Bottom spacing for action bar */}
      <div className="h-20" />

      {/* Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-2 max-w-lg mx-auto">
          {isSeller ? (
            product.status === ProductStatus.ON_SALE ? (
              <button
                onClick={() => setShowDelistDialog(true)}
                className="flex-1 h-10 bg-red-500 text-white text-sm font-medium rounded-full hover:bg-red-600 transition-colors"
              >
                下架
              </button>
            ) : product.status === ProductStatus.SOLD && transaction?.status === TransactionStatus.PENDING ? (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="flex-1 h-10 bg-gray-500 text-white text-sm font-medium rounded-full hover:bg-gray-600 transition-colors"
              >
                取消交易
              </button>
            ) : null
          ) : product.status === ProductStatus.ON_SALE ? (
            <>
              <button
                onClick={toggleFavorite}
                disabled={togglingFav}
                aria-label={favorited ? '取消收藏' : '收藏商品'}
                className={`flex flex-col items-center gap-0.5 transition-colors px-2 ${
                  favorited ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                } ${togglingFav ? 'opacity-50' : ''}`}
              >
                <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
                <span className="text-xs">{favorited ? '已收藏' : '收藏'}</span>
              </button>
              <button
                onClick={() => setShowBuyDialog(true)}
                className="h-10 px-5 bg-green-500 text-white text-sm font-medium rounded-full hover:bg-green-600 transition-colors"
              >
                交易
              </button>
              <Link
                href={`/messages/${product.sellerId}?productId=${product.id}`}
                className="flex-1 h-10 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                联系卖家
              </Link>
            </>
          ) : product.status === ProductStatus.SOLD && transaction?.status === TransactionStatus.PENDING ? (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="flex-1 h-10 bg-gray-500 text-white text-sm font-medium rounded-full hover:bg-gray-600 transition-colors"
            >
              取消交易
            </button>
          ) : null}
        </div>
      </div>

      {/* Delist Confirmation Dialog */}
      <Dialog open={showDelistDialog} onOpenChange={setShowDelistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认下架</DialogTitle>
            <DialogDescription>
              下架后商品将不再显示在商品列表中，买家将无法看到此商品。你可以随时重新上架。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelistDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelist}
              disabled={delisting}
            >
              {delisting ? '下架中...' : '确认下架'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Confirmation Dialog */}
      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认交易</DialogTitle>
            <DialogDescription>
              你将购买此商品，价格为 ¥{displayPrice.toFixed(2)}。交易创建后卖家将收到通知。
            </DialogDescription>
          </DialogHeader>
          {buyError && (
            <p className="text-sm text-red-500">{buyError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBuyDialog(false)
                setBuyError('')
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleBuy}
              disabled={buying}
            >
              {buying ? '提交中...' : '确认交易'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Transaction Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取消交易</DialogTitle>
            <DialogDescription>
              确定要取消此交易吗？取消后商品将恢复为在售状态。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              返回
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelTransaction}
              disabled={cancelling}
            >
              {cancelling ? '取消中...' : '确认取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
