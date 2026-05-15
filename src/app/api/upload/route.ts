import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { uploadLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { allowed, remaining, resetIn } = uploadLimiter.check(`upload:${session.user.id}`)

    if (!allowed) {
      return NextResponse.json(
        { error: `上传过于频繁，请在 ${resetIn} 秒后重试` },
        {
          status: 429,
          headers: {
            'Retry-After': String(resetIn),
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '仅支持 JPG、PNG、WebP、GIF 格式的图片' },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过 5MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const magicBytesMap: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'image/gif': [0x47, 0x49, 0x46, 0x38],
    }

    const expectedMagic = magicBytesMap[file.type]
    if (expectedMagic) {
      const isValid = expectedMagic.every((byte, i) => buffer[i] === byte)
      if (!isValid) {
        return NextResponse.json(
          { error: '文件内容与类型不匹配，已被拒绝' },
          { status: 400 }
        )
      }
    }

    // 从 MIME 类型推断扩展名，不信任用户文件名
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const ext = extMap[file.type] || 'jpg'
    const uniqueName = `${Date.now()}-${randomUUID()}.${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const filePath = `${uploadDir}/${uniqueName}`
    await writeFile(filePath, buffer)

    return NextResponse.json({ url: `/uploads/${uniqueName}` })
  } catch (error) {
    console.error('上传文件失败:', error)
    return NextResponse.json(
      { error: '上传文件失败，请稍后重试' },
      { status: 500 }
    )
  }
}
