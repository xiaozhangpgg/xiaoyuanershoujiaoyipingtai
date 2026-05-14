import { NextRequest, NextResponse } from 'next/server'
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        email: true,
        studentId: true,
        avatar: true,
        verified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('获取当前用户信息失败:', error)
    return NextResponse.json(
      { error: '获取用户信息失败，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: '用户身份无效' }, { status: 400 })
    }

    const body = await request.json()
    const { nickname, avatar } = body

    const data: { nickname?: string; avatar?: string } = {}

    if (nickname !== undefined) {
      if (typeof nickname !== 'string' || nickname.trim().length === 0) {
        return NextResponse.json({ error: '昵称不能为空' }, { status: 400 })
      }
      if (nickname.trim().length > 20) {
        return NextResponse.json({ error: '昵称长度不能超过20个字符' }, { status: 400 })
      }
      data.nickname = nickname.trim()
    }

    if (avatar !== undefined) {
      data.avatar = avatar
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        nickname: true,
        email: true,
        studentId: true,
        avatar: true,
        verified: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return NextResponse.json(
      { error: '更新失败，请稍后重试' },
      { status: 500 }
    )
  }
}
