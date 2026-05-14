import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { ProductCondition, ProductStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productId = parseInt(id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: '无效的商品ID' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('获取商品详情失败:', error)
    return NextResponse.json(
      { error: '获取商品详情失败，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params
    const productId = parseInt(id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: '无效的商品ID' }, { status: 400 })
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    if (existingProduct.sellerId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: '无权修改此商品' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, price, images, categoryId, condition, location, status } = body

    const updateData: Record<string, unknown> = {}

    if (title !== undefined) {
      if (title.length > 100) {
        return NextResponse.json({ error: '标题长度不能超过100个字符' }, { status: 400 })
      }
      updateData.title = title
    }
    if (description !== undefined) {
      if (description.length > 2000) {
        return NextResponse.json({ error: '描述长度不能超过2000个字符' }, { status: 400 })
      }
      updateData.description = description
    }
    if (price !== undefined) {
      const parsedPrice = parseFloat(price)
      if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 99999999.99) {
        return NextResponse.json({ error: '价格无效，应为0-99999999.99之间的正数' }, { status: 400 })
      }
      updateData.price = parsedPrice
    }
    if (images !== undefined) updateData.images = images
    if (categoryId !== undefined) {
      const catId = parseInt(categoryId)
      if (isNaN(catId)) {
        return NextResponse.json({ error: '分类ID无效' }, { status: 400 })
      }
      const category = await prisma.category.findUnique({ where: { id: catId } })
      if (!category) {
        return NextResponse.json({ error: '商品分类不存在' }, { status: 400 })
      }
      updateData.categoryId = catId
    }
    if (condition !== undefined) {
      if (!Object.values(ProductCondition).includes(condition)) {
        return NextResponse.json({ error: '商品成色无效' }, { status: 400 })
      }
      updateData.condition = condition
    }
    if (location !== undefined) {
      if (location.length > 200) {
        return NextResponse.json({ error: '交易地点长度不能超过200个字符' }, { status: 400 })
      }
      updateData.location = location
    }
    if (status !== undefined) {
      if (!Object.values(ProductStatus).includes(status)) {
        return NextResponse.json({ error: '商品状态无效' }, { status: 400 })
      }
      updateData.status = status
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
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

    return NextResponse.json(product)
  } catch (error) {
    console.error('更新商品失败:', error)
    return NextResponse.json(
      { error: '更新商品失败，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params
    const productId = parseInt(id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: '无效的商品ID' }, { status: 400 })
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    if (existingProduct.sellerId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: '无权删除此商品' }, { status: 403 })
    }

    await prisma.product.delete({
      where: { id: productId },
    })

    return NextResponse.json({ message: '商品已删除' })
  } catch (error) {
    console.error('删除商品失败:', error)
    return NextResponse.json(
      { error: '删除商品失败，请稍后重试' },
      { status: 500 }
    )
  }
}
