import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: '用户身份无效' }, { status: 400 })
    }

    const [products, favorites] = await Promise.all([
      prisma.product.count({ where: { sellerId: userId } }),
      prisma.favorite.count({ where: { userId } }),
    ])

    return NextResponse.json({ products, favorites })
  } catch (error) {
    console.error('获取用户统计信息失败:', error)
    return NextResponse.json(
      { error: '获取统计信息失败，请稍后重试' },
      { status: 500 }
    )
  }
}
