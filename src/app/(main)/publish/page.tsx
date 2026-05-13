'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Plus, X, Loader2, Camera } from 'lucide-react'
import { conditionLabels } from '@/types'
import { ProductCondition } from '@prisma/client'

interface Category {
  id: number
  name: string
}

export default function PublishPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [condition, setCondition] = useState<ProductCondition | ''>('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
        }
      } catch {
        setError('分类加载失败，请刷新重试')
      }
    }
    fetchCategories()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remaining = 9 - images.length
    const filesToUpload = Array.from(files).slice(0, remaining)

    if (filesToUpload.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const uploadResults = await Promise.all(
        filesToUpload.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch('/api/upload', { method: 'POST', body: formData })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || '上传失败')
          }
          const data = await res.json()
          return data.url as string
        })
      )
      setImages((prev) => [...prev, ...uploadResults])
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('请输入商品标题')
      return
    }
    if (!price || parseFloat(price) <= 0) {
      setError('请输入有效的价格')
      return
    }
    if (!categoryId) {
      setError('请选择商品分类')
      return
    }
    if (!condition) {
      setError('请选择商品成色')
      return
    }
    if (!location.trim()) {
      setError('请输入交易地点')
      return
    }
    if (!description.trim()) {
      setError('请输入商品描述')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price),
          images,
          categoryId: parseInt(categoryId),
          condition,
          location: location.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '发布失败')
      }

      const product = await res.json()
      router.push(`/products/${product.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="加载中">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white">
        <div className="flex items-center justify-between px-4 h-11">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">发布商品</span>
          <div className="w-8" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            商品图片 ({images.length}/9)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((url, idx) => (
              <div
                key={url}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                <Image
                  src={url}
                  alt={`商品图片 ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="删除图片"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    <span className="text-xs">添加图片</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            商品标题
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入商品标题"
            maxLength={100}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            价格 (元)
          </label>
          <input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            min="0.01"
            max="99999999.99"
            step="0.01"
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            商品分类
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow bg-white"
          >
            <option value="">请选择分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            商品成色
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="商品成色">
            {(Object.entries(conditionLabels) as [ProductCondition, string][]).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={condition === value}
                  onClick={() => setCondition(value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    condition === value
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            交易地点
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="如：学校东门、图书馆门口"
            maxLength={200}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            商品描述
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请详细描述商品的情况，如购买时间、使用情况等"
            maxLength={2000}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {description.length}/2000
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full h-11 bg-green-500 text-white text-sm font-medium rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              发布中...
            </>
          ) : (
            '发布商品'
          )}
        </button>
      </form>
    </div>
  )
}
