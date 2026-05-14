import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: '商品ID不能为空' }, { status: 400 })
    }

    const parsedProductId = parseInt(productId)
    if (isNaN(parsedProductId)) {
      return NextResponse.json({ error: '商品ID无效' }, { status: 400 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: parsedProductId },
    })
    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // Toggle favorite
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: parsedProductId,
        },
      },
    })

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({ favorited: false })
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          productId: parsedProductId,
        },
      })
      return NextResponse.json({ favorited: true })
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
    return NextResponse.json(
      { error: '操作失败，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const skip = (page - 1) * limit

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                  verified: true,
                },
              },
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.favorite.count({ where: { userId } }),
    ])

    const items = favorites.map((fav) => fav.product)

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    return NextResponse.json(
      { error: '获取收藏列表失败，请稍后重试' },
      { status: 500 }
    )
  }
}
