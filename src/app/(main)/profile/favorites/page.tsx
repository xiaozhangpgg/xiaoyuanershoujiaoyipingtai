'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Heart,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface ProductItem {
  id: number
  title: string
  price: string | number
  images: string[]
  location: string
}

export default function MyFavoritesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/favorites?limit=50')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取收藏列表失败')
      }
      const data = await res.json()
      setProducts(data.items)
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
      fetchFavorites()
    }
  }, [status, router, fetchFavorites])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" aria-label="加载中" />
        <span className="sr-only">加载中</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 h-11">
          <button
            onClick={() => router.push('/profile')}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium flex-1 text-center pr-6">我的收藏</span>
        </div>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <AlertCircle className="w-16 h-16 mb-4" />
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={fetchFavorites}
            className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
          >
            重试
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Heart className="w-16 h-16 mb-4" />
          <p className="text-sm mb-1">还没有收藏商品</p>
          <p className="text-xs mb-4">去首页看看有没有心仪的物品</p>
          <Link
            href="/"
            className="px-4 py-2 text-sm text-white bg-green-500 rounded-full hover:bg-green-600"
          >
            去逛逛
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3">
          {products.map((product) => {
            const imageUrl = product.images.length > 0 ? product.images[0] : null
            const parsedPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price
            const displayPrice = isNaN(parsedPrice) ? 0 : parsedPrice

            return (
              <Link key={product.id} href={`/products/${product.id}`} className="block">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative aspect-square bg-gray-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <Heart className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="text-sm text-gray-800 line-clamp-2 leading-snug mb-1">{product.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-red-500 font-semibold text-base">
                        ¥{displayPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 truncate ml-1 max-w-[50%]">{product.location}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
