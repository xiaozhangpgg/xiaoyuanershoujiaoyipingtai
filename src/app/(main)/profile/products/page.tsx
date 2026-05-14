'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Package,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { ProductStatus } from '@prisma/client'

interface ProductItem {
  id: number
  title: string
  price: string | number
  images: string[]
  location: string
  status: ProductStatus
}

const statusLabels: Record<ProductStatus, string> = {
  ON_SALE: '在售',
  SOLD: '已售',
  OFF_SHELF: '下架',
}

const statusStyles: Record<ProductStatus, string> = {
  ON_SALE: 'bg-green-500 text-white',
  SOLD: 'bg-gray-500 text-white',
  OFF_SHELF: 'bg-gray-400 text-white',
}

export default function MyProductsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/products?sellerId=me&limit=50')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取商品列表失败')
      }
      const data = await res.json()
      setProducts(data.products)
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
      fetchProducts()
    }
  }, [status, router, fetchProducts])

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
          <span className="text-sm font-medium flex-1 text-center pr-6">我的发布</span>
        </div>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <AlertCircle className="w-16 h-16 mb-4" />
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
          >
            重试
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Package className="w-16 h-16 mb-4" />
          <p className="text-sm mb-1">还没有发布商品</p>
          <p className="text-xs mb-4">发布你的第一个闲置物品吧</p>
          <Link
            href="/publish"
            className="px-4 py-2 text-sm text-white bg-green-500 rounded-full hover:bg-green-600"
          >
            去发布
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
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    <span className={`absolute top-1.5 right-1.5 text-xs px-1.5 py-0.5 rounded-full ${statusStyles[product.status]}`}>
                      {statusLabels[product.status]}
                    </span>
                  </div>
                  <div className="p-2">
                    <h3 className="text-sm text-gray-800 line-clamp-2 leading-snug mb-1">{product.title}</h3>
                    <span className="text-red-500 font-semibold text-base">
                      ¥{displayPrice.toFixed(2)}
                    </span>
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
