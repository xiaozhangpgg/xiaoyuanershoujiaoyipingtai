import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

// TODO: 添加速率限制防止滥用上传

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
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

    const filePath = path.join(uploadDir, uniqueName)
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
