import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password, nickname, studentId } = await request.json()

    // 验证必填字段
    if (!email || !password || !nickname || !studentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // 检查学号是否已存在
    const existingStudentId = await prisma.user.findUnique({
      where: { studentId },
    })

    if (existingStudentId) {
      return NextResponse.json(
        { error: 'Student ID already exists' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        studentId,
        verified: false, // 需要学信网认证后才设为 true
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
