import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params
    const transactionId = parseInt(id)

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: '无效的交易ID' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            price: true,
            condition: true,
            location: true,
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

    if (!transaction) {
      return NextResponse.json({ error: '交易不存在' }, { status: 404 })
    }

    const userId = parseInt(session.user.id)

    // 验证当前用户是该交易的买家或卖家
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      return NextResponse.json({ error: '无权查看此交易' }, { status: 403 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('获取交易详情失败:', error)
    return NextResponse.json(
      { error: '获取交易详情失败，请稍后重试' },
      { status: 500 }
    )
  }
}
