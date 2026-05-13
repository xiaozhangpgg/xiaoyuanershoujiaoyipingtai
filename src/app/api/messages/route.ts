import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')
    const productIdParam = searchParams.get('productId')
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')

    if (!userIdParam || !productIdParam) {
      return NextResponse.json(
        { error: '缺少必要参数：userId 和 productId' },
        { status: 400 }
      )
    }

    const otherUserId = parseInt(userIdParam, 10)
    const productId = parseInt(productIdParam, 10)
    const currentUserId = parseInt(session.user.id, 10)

    if (isNaN(otherUserId) || isNaN(productId)) {
      return NextResponse.json({ error: '参数格式无效' }, { status: 400 })
    }

    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10) || 50))

    // 查询条件：当前用户必须是消息的发送者或接收者
    const where = {
      productId,
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    }

    const messages = await prisma.message.findMany({
      where: {
        ...where,
        ...(cursor ? { id: { lt: parseInt(cursor, 10) } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('获取消息列表失败:', error)
    return NextResponse.json(
      { error: '获取消息列表失败，请稍后重试' },
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
    const { content, receiverId, productId } = body

    // 验证必填字段
    if (!content || receiverId === undefined || productId === undefined) {
      return NextResponse.json(
        { error: '请填写所有必填字段：content、receiverId、productId' },
        { status: 400 }
      )
    }

    // 验证内容不为空
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 })
    }

    // 验证长度
    if (content.length > 5000) {
      return NextResponse.json(
        { error: '消息内容长度不能超过5000个字符' },
        { status: 400 }
      )
    }

    const parsedReceiverId = parseInt(receiverId, 10)
    const parsedProductId = parseInt(productId, 10)
    const currentUserId = parseInt(session.user.id, 10)

    if (isNaN(parsedReceiverId) || isNaN(parsedProductId)) {
      return NextResponse.json({ error: '参数格式无效' }, { status: 400 })
    }

    // 不能给自己发消息
    if (currentUserId === parsedReceiverId) {
      return NextResponse.json(
        { error: '不能给自己发送消息' },
        { status: 400 }
      )
    }

    // 验证接收者存在
    const receiver = await prisma.user.findUnique({
      where: { id: parsedReceiverId },
      select: { id: true },
    })

    if (!receiver) {
      return NextResponse.json({ error: '接收者不存在' }, { status: 400 })
    }

    // 验证商品存在且在售
    const product = await prisma.product.findUnique({
      where: { id: parsedProductId },
      select: { id: true, status: true },
    })

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 400 })
    }

    if (product.status !== 'ON_SALE') {
      return NextResponse.json({ error: '该商品已下架或已售出' }, { status: 400 })
    }

    // 使用事务确保原子性
    const [message] = await prisma.$transaction([
      // 创建消息
      prisma.message.create({
        data: {
          content: content.trim(),
          senderId: currentUserId,
          receiverId: parsedReceiverId,
          productId: parsedProductId,
        },
        include: {
          sender: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      }),
      // 创建或更新会话（确保 user1Id < user2Id）
      prisma.conversation.upsert({
        where: {
          user1Id_user2Id_productId: {
            user1Id: Math.min(currentUserId, parsedReceiverId),
            user2Id: Math.max(currentUserId, parsedReceiverId),
            productId: parsedProductId,
          },
        },
        update: {
          lastMessageAt: new Date(),
        },
        create: {
          user1Id: Math.min(currentUserId, parsedReceiverId),
          user2Id: Math.max(currentUserId, parsedReceiverId),
          productId: parsedProductId,
          lastMessageAt: new Date(),
        },
      }),
    ])

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('发送消息失败:', error)
    return NextResponse.json(
      { error: '发送消息失败，请稍后重试' },
      { status: 500 }
    )
  }
}
