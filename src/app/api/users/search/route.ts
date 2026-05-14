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
    if (isNaN(userId)) {
      return NextResponse.json({ error: '用户身份无效' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json({ error: '请输入搜索关键词' }, { status: 400 })
    }

    const trimmed = keyword.trim()
    if (trimmed.length > 50) {
      return NextResponse.json({ error: '搜索关键词长度不能超过50个字符' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { nickname: { contains: trimmed, mode: 'insensitive' } },
          { studentId: { contains: trimmed } },
        ],
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
      },
      take: 20,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('搜索用户失败:', error)
    return NextResponse.json(
      { error: '搜索用户失败，请稍后重试' },
      { status: 500 }
    )
  }
}
