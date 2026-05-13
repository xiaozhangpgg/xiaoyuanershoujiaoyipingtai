import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { TransactionStatus, Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params
    const transactionId = parseInt(id, 10)

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: '无效的交易ID' }, { status: 400 })
    }

    const body = await request.json()
    const { action } = body

    if (!action || !['confirm', 'cancel'].includes(action)) {
      return NextResponse.json({ error: '操作类型无效，请使用 confirm 或 cancel' }, { status: 400 })
    }

    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: '用户身份无效' }, { status: 401 })
    }

    if (action === 'confirm') {
      // 只有买家可以确认交易完成
      // 允许从 PENDING 或 SELLER_CONFIRMED 状态确认
      try {
        const updatedTransaction = await prisma.transaction.update({
          where: {
            id: transactionId,
            buyerId: userId,
            status: {
              in: [TransactionStatus.PENDING, TransactionStatus.SELLER_CONFIRMED],
            },
          },
          data: {
            status: TransactionStatus.COMPLETED,
            buyerConfirmedAt: new Date(),
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

        return NextResponse.json(updatedTransaction)
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          return NextResponse.json(
            { error: '交易不存在、无权操作或当前状态不允许此操作' },
            { status: 400 }
          )
        }
        throw error
      }
    }

    if (action === 'cancel') {
      // 买家或卖家都可以取消交易（仅 PENDING 状态）
      try {
        const updatedTransaction = await prisma.$transaction(async (tx) => {
          const cancelled = await tx.transaction.update({
            where: {
              id: transactionId,
              OR: [
                { buyerId: userId },
                { sellerId: userId },
              ],
              status: TransactionStatus.PENDING,
            },
            data: {
              status: TransactionStatus.CANCELLED,
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

          // 恢复商品为在售状态
          await tx.product.update({
            where: { id: cancelled.productId },
            data: { status: 'ON_SALE' },
          })

          return cancelled
        })

        return NextResponse.json(updatedTransaction)
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          return NextResponse.json(
            { error: '交易不存在、无权操作或当前状态不允许此操作' },
            { status: 400 }
          )
        }
        throw error
      }
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (error) {
    console.error('操作交易失败:', error)
    return NextResponse.json(
      { error: '操作交易失败，请稍后重试' },
      { status: 500 }
    )
  }
}
