import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params
    const messageId = parseInt(id, 10)

    if (isNaN(messageId)) {
      return NextResponse.json({ error: '消息ID无效' }, { status: 400 })
    }

    const currentUserId = parseInt(session.user.id, 10)

    // 直接更新，通过 where 条件同时验证存在性和权限
    const result = await prisma.message.updateMany({
      where: {
        id: messageId,
        receiverId: currentUserId,
      },
      data: { isRead: true },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: '消息不存在或无权操作' },
        { status: 404 }
      )
    }

    // 返回更新后的消息
    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('标记消息已读失败:', error)
    return NextResponse.json(
      { error: '标记消息已读失败，请稍后重试' },
      { status: 500 }
    )
  }
}
