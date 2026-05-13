import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { ProductCondition, ProductStatus, Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const category = searchParams.get('category')
    const keyword = searchParams.get('keyword')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const location = searchParams.get('location')

    const where: Prisma.ProductWhereInput = {
      status: 'ON_SALE',
    }

    if (category) {
      const catId = parseInt(category)
      if (isNaN(catId)) {
        return NextResponse.json({ error: '分类ID无效' }, { status: 400 })
      }
      where.categoryId = catId
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    if (minPrice || maxPrice) {
      const priceFilter: Prisma.DecimalFilter<'Product'> = {}
      if (minPrice) {
        const min = parseFloat(minPrice)
        if (isNaN(min)) {
          return NextResponse.json({ error: '最低价格无效' }, { status: 400 })
        }
        priceFilter.gte = min
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice)
        if (isNaN(max)) {
          return NextResponse.json({ error: '最高价格无效' }, { status: 400 })
        }
        priceFilter.lte = max
      }
      where.price = priceFilter
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' }
    }

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('获取商品列表失败:', error)
    return NextResponse.json(
      { error: '获取商品列表失败，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, price, images, categoryId, condition, location } = body

    if (!title || !description || price === undefined || !categoryId || !condition || !location) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 })
    }

    // 长度验证
    if (title.length > 100) {
      return NextResponse.json({ error: '标题长度不能超过100个字符' }, { status: 400 })
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: '描述长度不能超过2000个字符' }, { status: 400 })
    }
    if (location.length > 200) {
      return NextResponse.json({ error: '交易地点长度不能超过200个字符' }, { status: 400 })
    }

    // 价格验证
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 99999999.99) {
      return NextResponse.json({ error: '价格无效，应为0-99999999.99之间的正数' }, { status: 400 })
    }

    if (!Object.values(ProductCondition).includes(condition)) {
      return NextResponse.json({ error: '商品成色无效' }, { status: 400 })
    }

    const catId = parseInt(categoryId)
    if (isNaN(catId)) {
      return NextResponse.json({ error: '分类ID无效' }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id: catId },
    })

    if (!category) {
      return NextResponse.json({ error: '商品分类不存在' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parsedPrice,
        images: images || [],
        condition: condition as ProductCondition,
        location,
        sellerId: parseInt(session.user.id),
        categoryId: catId,
      },
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
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('创建商品失败:', error)
    return NextResponse.json(
      { error: '创建商品失败，请稍后重试' },
      { status: 500 }
    )
  }
}
