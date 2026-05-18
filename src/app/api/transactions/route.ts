import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { TransactionStatus, ProductStatus, Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: '用户身份无效' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const productIdParam = searchParams.get('productId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

    const where: Prisma.TransactionWhereInput = {}

    // 按商品过滤
    if (productIdParam) {
      const pid = parseInt(productIdParam, 10)
      if (isNaN(pid)) {
        return NextResponse.json({ error: '商品ID无效' }, { status: 400 })
      }
      where.productId = pid
      // 查看商品交易时，只显示与当前用户相关的交易
      where.OR = [{ buyerId: userId }, { sellerId: userId }]
    }

    // 按角色过滤（仅在没有按商品过滤时生效）
    if (!productIdParam) {
      if (role === 'buyer') {
        where.buyerId = userId
      } else if (role === 'seller') {
        where.sellerId = userId
      } else {
        where.OR = [{ buyerId: userId }, { sellerId: userId }]
      }
    }

    // 按状态过滤
    if (status) {
      if (!Object.values(TransactionStatus).includes(status as TransactionStatus)) {
        return NextResponse.json({ error: '交易状态无效' }, { status: 400 })
      }
      where.status = status as TransactionStatus
    }

    const skip = (page - 1) * limit

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
          seller: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          buyer: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('获取交易列表失败:', error)
    return NextResponse.json(
      { error: '获取交易列表失败，请稍后重试' },
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

    const buyerId = parseInt(session.user.id, 10)
    if (isNaN(buyerId)) {
      return NextResponse.json({ error: '用户身份无效' }, { status: 401 })
    }

    const body = await request.json()
    const { productId } = body

    // 参数验证
    if (!productId) {
      return NextResponse.json({ error: '请提供商品ID' }, { status: 400 })
    }

    const parsedProductId = parseInt(productId, 10)
    if (isNaN(parsedProductId)) {
      return NextResponse.json({ error: '商品ID无效' }, { status: 400 })
    }

    // 使用事务确保原子性（将所有检查移入事务内）
    const transaction = await prisma.$transaction(async (tx) => {
      // 验证商品存在且在售
      const product = await tx.product.findUnique({
        where: { id: parsedProductId },
      })

      if (!product) {
        throw new Prisma.PrismaClientKnownRequestError('商品不存在', {
          code: 'P2025',
          clientVersion: '1.0',
        })
      }

      if (product.status !== ProductStatus.ON_SALE) {
        throw new Prisma.PrismaClientKnownRequestError('该商品不在出售中', {
          code: 'P2025',
          clientVersion: '1.0',
        })
      }

      const sellerId = product.sellerId

      // 不能与自己交易
      if (buyerId === sellerId) {
        throw new Prisma.PrismaClientKnownRequestError('不能购买自己的商品', {
          code: 'P2025',
          clientVersion: '1.0',
        })
      }

      // 检查是否已有该商品的交易记录
      const existingTransaction = await tx.transaction.findUnique({
        where: { productId: parsedProductId },
      })

      if (existingTransaction) {
        throw new Prisma.PrismaClientKnownRequestError('该商品已有进行中的交易', {
          code: 'P2025',
          clientVersion: '1.0',
        })
      }

      // 创建交易并更新商品状态
      const newTransaction = await tx.transaction.create({
        data: {
          price: product.price,
          productId: parsedProductId,
          sellerId,
          buyerId,
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
          seller: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          buyer: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      })

      await tx.product.update({
        where: { id: parsedProductId },
        data: { status: ProductStatus.SOLD },
      })

      return newTransaction
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error('创建交易失败:', error)
    return NextResponse.json(
      { error: '创建交易失败，请稍后重试' },
      { status: 500 }
    )
  }
}
