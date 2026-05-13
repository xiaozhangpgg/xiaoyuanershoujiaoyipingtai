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
      return NextResponse.json({ error: '用户ID无效' }, { status: 400 })
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        user2: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    // 批量获取所有会话的最后一条消息（避免 N+1 查询）
    const conversationKeys = conversations.map((c: typeof conversations[number]) => ({
      productId: c.productId,
      user1Id: c.user1Id,
      user2Id: c.user2Id,
    }))

    const lastMessages = await Promise.all(
      conversationKeys.map((key: typeof conversationKeys[number]) =>
        prisma.message.findFirst({
          where: {
            productId: key.productId,
            OR: [
              { senderId: key.user1Id, receiverId: key.user2Id },
              { senderId: key.user2Id, receiverId: key.user1Id },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        })
      )
    )

    // 组装响应，只返回 otherUser（不返回 user1/user2 原始字段）
    const result = conversations.map((conversation: typeof conversations[number], index: number) => {
      const otherUser =
        conversation.user1Id === userId
          ? conversation.user2
          : conversation.user1

      return {
        id: conversation.id,
        lastMessageAt: conversation.lastMessageAt,
        productId: conversation.productId,
        product: conversation.product,
        otherUser,
        lastMessage: lastMessages[index],
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('获取会话列表失败:', error)
    return NextResponse.json(
      { error: '获取会话列表失败，请稍后重试' },
      { status: 500 }
    )
  }
}
