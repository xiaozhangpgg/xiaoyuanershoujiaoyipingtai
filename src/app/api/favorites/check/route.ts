import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: '商品ID不能为空' }, { status: 400 })
    }

    const parsedProductId = parseInt(productId)
    if (isNaN(parsedProductId)) {
      return NextResponse.json({ error: '商品ID无效' }, { status: 400 })
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: parsedProductId,
        },
      },
    })

    return NextResponse.json({ favorited: !!existing })
  } catch (error) {
    console.error('检查收藏状态失败:', error)
    return NextResponse.json(
      { error: '检查失败，请稍后重试' },
      { status: 500 }
    )
  }
}
