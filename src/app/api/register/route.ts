import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { registerLimiter } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { allowed, remaining, resetIn } = registerLimiter.check(`register:${clientIp}`)

    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${resetIn} 秒后重试` },
        {
          status: 429,
          headers: {
            'Retry-After': String(resetIn),
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      )
    }

    const { email, password, nickname, studentId, verificationImage } = await request.json()

    // 验证必填字段
    if (!email || !password || !nickname || !studentId) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 邮箱格式验证和规范化
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      )
    }
    const normalizedEmail = email.toLowerCase().trim()

    // 密码强度验证
    if (password.length < 8) {
      return NextResponse.json(
        { error: '密码长度至少8位' },
        { status: 400 }
      )
    }
    if (password.length > 128) {
      return NextResponse.json(
        { error: '密码长度不能超过128位' },
        { status: 400 }
      )
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { error: '密码必须包含字母和数字' },
        { status: 400 }
      )
    }

    // 昵称长度验证
    if (nickname.length > 50) {
      return NextResponse.json(
        { error: '昵称长度不能超过50个字符' },
        { status: 400 }
      )
    }

    // 学号格式验证
    const studentIdRegex = /^\d{6,20}$/
    if (!studentIdRegex.test(studentId)) {
      return NextResponse.json(
        { error: '学号格式不正确，应为6-20位数字' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户（利用数据库唯一约束处理并发竞争）
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        nickname,
        studentId,
        verified: false,
        verificationImage: verificationImage || null,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    })
  } catch (error) {
    // 处理唯一约束冲突（P2002）- 并发注册时的竞态条件
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || []
        if (target.includes('email')) {
          return NextResponse.json(
            { error: '该邮箱已被注册' },
            { status: 400 }
          )
        }
        if (target.includes('studentId')) {
          return NextResponse.json(
            { error: '该学号已被注册' },
            { status: 400 }
          )
        }
      }
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}
