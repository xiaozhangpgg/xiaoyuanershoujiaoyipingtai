import { ProductCondition, ProductStatus } from '@prisma/client'

export interface Product {
  id: number
  title: string
  description: string
  price: number
  images: string[]
  condition: ProductCondition
  location: string
  status: ProductStatus
  createdAt: Date
  sellerId: number
  categoryId: number
  seller?: User
  category?: Category
}

export interface User {
  id: number
  email: string
  nickname: string
  avatar: string | null
  studentId: string
  verified: boolean
}

export interface Category {
  id: number
  name: string
}

export const conditionLabels: Record<ProductCondition, string> = {
  [ProductCondition.NEW]: '全新',
  [ProductCondition.LIKE_NEW]: '几乎全新',
  [ProductCondition.SLIGHTLY_USED]: '轻微使用痕迹',
  [ProductCondition.USED]: '明显使用痕迹',
}
