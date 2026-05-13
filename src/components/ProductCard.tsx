'use client'

import Image from 'next/image'
import Link from 'next/link'

interface ProductCardProps {
  id: number
  title: string
  price: number | string
  images: string[]
  location: string
}

export default function ProductCard({ id, title, price, images, location }: ProductCardProps) {
  const imageUrl = images.length > 0 ? images[0] : null
  const parsedPrice = typeof price === 'string' ? parseFloat(price) : price
  const displayPrice = isNaN(parsedPrice) ? 0 : parsedPrice

  return (
    <Link href={`/products/${id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-square bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">
              <svg className="w-12 h-12" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="sr-only">暂无图片</span>
            </div>
          )}
        </div>
        <div className="p-2">
          <h3 className="text-sm text-gray-800 line-clamp-2 leading-snug mb-1">{title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-red-500 font-semibold text-base">
              ¥{displayPrice.toFixed(2)}
            </span>
            <span className="text-xs text-gray-400 truncate ml-1 max-w-[50%]">{location}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
