'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import CategoryNav from '@/components/CategoryNav'
import ProductCard from '@/components/ProductCard'
import { Loader2, PackageOpen, AlertCircle } from 'lucide-react'

interface Product {
  id: number
  title: string
  price: string
  images: string[]
  location: string
}

interface Category {
  id: number
  name: string
}

export default function HomePage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const keywordParam = searchParams.get('keyword') || ''
  const categoryParam = searchParams.get('category')

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(
    categoryParam ? parseInt(categoryParam) : null
  )
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasMounted = useRef(false)

  // Sync activeCategory when URL categoryParam changes (browser back/forward)
  useEffect(() => {
    setActiveCategory(categoryParam ? parseInt(categoryParam) : null)
  }, [categoryParam])

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
        }
      } catch {
        // Categories API may not exist; fall back to empty list
      }
    }
    fetchCategories()
  }, [])

  // Fetch products when filters change
  const fetchProducts = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '10')
      if (activeCategory) params.set('category', String(activeCategory))
      if (keywordParam) params.set('keyword', keywordParam)

      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      if (append) {
        setProducts((prev) => [...prev, ...data.products])
      } else {
        setProducts(data.products)
      }
      setTotalPages(data.totalPages)
      setPage(pageNum)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeCategory, keywordParam])

  useEffect(() => {
    fetchProducts(1)
  }, [fetchProducts])

  // Sync URL when category changes (skip initial mount)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', String(activeCategory))
    if (keywordParam) params.set('keyword', keywordParam)
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/', { scroll: false })
  }, [activeCategory, keywordParam, router])

  const handleCategoryChange = (id: number | null) => {
    setActiveCategory(id)
  }

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchProducts(page + 1, true)
    }
  }

  return (
    <div>
      <SearchBar defaultValue={keywordParam} />

      {categories.length > 0 && (
        <CategoryNav
          categories={categories}
          activeId={activeCategory}
          onChange={handleCategoryChange}
        />
      )}

      <div className="px-4 py-3">
        {keywordParam && (
          <p className="text-sm text-gray-500 mb-3">
            搜索 &ldquo;{keywordParam}&rdquo; 的结果
          </p>
        )}

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
              onClick={() => fetchProducts(1)}
              className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
            >
              重试
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <PackageOpen className="w-16 h-16 mb-4" />
            <p className="text-sm">暂无商品</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  images={product.images}
                  location={product.location}
                />
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      加载中...
                    </span>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
