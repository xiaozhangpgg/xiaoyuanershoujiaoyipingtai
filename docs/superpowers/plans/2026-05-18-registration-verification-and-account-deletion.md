# 注册学信网认证 & 注销账号 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 注册时支持上传学信网截图进行学生认证，个人中心支持注销账号（硬删除）

**Architecture:** 复用现有 `/api/upload` 接口处理图片上传，注册页面新增图片上传步骤；注销账号通过 `DELETE /api/users/me` 实现，使用 Prisma 事务按正确顺序删除所有关联数据。

**Tech Stack:** Next.js, Prisma, bcryptjs, shadcn/ui Dialog

---

## Task 1: 数据库迁移 — 添加 verificationImage 字段

**Files:**
- Modify: `prisma/schema.prisma:30-47`

- [ ] **Step 1: 修改 Prisma Schema**

在 `prisma/schema.prisma` 的 User 模型中，在 `verified` 字段后面添加 `verificationImage`：

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  nickname  String
  avatar    String?
  studentId String   @unique
  verified  Boolean  @default(false)
  verificationImage String?  // 学信网截图 URL
  createdAt DateTime @default(now())

  products      Product[]      @relation("SellerProducts")
  favorites     Favorite[]
  sentMessages  Message[]      @relation("SentMessages")
  receivedMsgs  Message[]      @relation("ReceivedMessages")
  conversations1 Conversation[] @relation("User1")
  conversations2 Conversation[] @relation("User2")
  soldTransactions  Transaction[] @relation("SellerTransactions")
  boughtTransactions Transaction[] @relation("BuyerTransactions")
}
```

- [ ] **Step 2: 创建并执行 Migration**

```bash
cd d:/校园二手交易平台
npx prisma migrate dev --name add_verification_image
```

Expected: Migration created and applied successfully.

---

## Task 2: 注册页面 — 添加学信网截图上传

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: 重写注册页面，添加图片上传功能**

完整替换 `src/app/(auth)/register/page.tsx`：

```tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    studentId: '',
  })
  const [verificationFile, setVerificationFile] = useState<File | null>(null)
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('仅支持 JPG、PNG、WebP、GIF 格式的图片')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过 5MB')
      return
    }

    setError('')
    setVerificationFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setVerificationPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setVerificationFile(null)
    setVerificationPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadVerificationImage = async (): Promise<string | null> => {
    if (!verificationFile) return null

    const formData = new FormData()
    formData.append('file', verificationFile)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || '上传截图失败')
    }

    const data = await res.json()
    return data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    if (!verificationFile) {
      setError('请上传学信网截图')
      setLoading(false)
      return
    }

    try {
      setUploading(true)
      const verificationImageUrl = await uploadVerificationImage()
      setUploading(false)

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname,
          studentId: formData.studentId,
          verificationImage: verificationImageUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        setLoading(false)
        return
      }

      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误，请检查网络连接')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-8">注册账号</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <input
            type="email"
            name="email"
            placeholder="邮箱"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder="密码"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <input
            type="password"
            name="confirmPassword"
            placeholder="确认密码"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <input
            type="text"
            name="nickname"
            placeholder="昵称"
            autoComplete="nickname"
            value={formData.nickname}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <input
            type="text"
            name="studentId"
            placeholder="学号"
            autoComplete="off"
            value={formData.studentId}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* 学信网截图上传 */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
            id="verification-upload"
          />

          {verificationPreview ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={verificationPreview}
                alt="学信网截图预览"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="verification-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">上传学信网截图</span>
              <span className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP、GIF，最大 5MB</span>
            </label>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {uploading ? '上传截图中...' : loading ? '注册中...' : '注册'}
        </button>
      </form>

      <Link href="/login" className="mt-4 text-green-500">
        已有账号？去登录
      </Link>
    </div>
  )
}
```

---

## Task 3: 注册 API — 接收 verificationImage

**Files:**
- Modify: `src/app/api/register/route.ts:25-94`

- [ ] **Step 1: 修改注册 API 接收 verificationImage**

在 `src/app/api/register/route.ts` 中，修改 `handleSubmit` 解构和用户创建逻辑：

将第 25 行：
```ts
const { email, password, nickname, studentId } = await request.json()
```

改为：
```ts
const { email, password, nickname, studentId, verificationImage } = await request.json()
```

将第 86-94 行的用户创建改为：
```ts
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
```

---

## Task 4: 注销账号 API

**Files:**
- Modify: `src/app/api/users/me/route.ts`

- [ ] **Step 1: 在 users/me/route.ts 末尾添加 DELETE 方法**

在文件末尾追加：

```ts
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: '用户身份无效' }, { status: 400 })
    }

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: '请输入密码' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: '密码不正确' }, { status: 400 })
    }

    // 获取用户发布的所有商品的图片，用于后续清理文件
    const products = await prisma.product.findMany({
      where: { sellerId: userId },
      select: { images: true },
    })
    const allProductImages = products.flatMap((p) => p.images)

    // 使用事务按顺序删除所有关联数据
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
      prisma.favorite.deleteMany({ where: { userId } }),
      prisma.transaction.deleteMany({ where: { OR: [{ sellerId: userId }, { buyerId: userId }] } }),
      prisma.conversation.deleteMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
      prisma.product.deleteMany({ where: { sellerId: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ])

    // 异步清理商品图片文件（不阻塞响应）
    const fs = await import('fs/promises')
    const path = await import('path')
    for (const imageUrl of allProductImages) {
      const filePath = path.join(process.cwd(), 'public', imageUrl)
      fs.unlink(filePath).catch(() => {})
    }
    // 清理头像
    if (user.avatar) {
      const avatarPath = path.join(process.cwd(), 'public', user.avatar)
      fs.unlink(avatarPath).catch(() => {})
    }
    // 清理学信网截图
    if (user.verificationImage) {
      const verifPath = path.join(process.cwd(), 'public', user.verificationImage)
      fs.unlink(verifPath).catch(() => {})
    }

    return NextResponse.json({ message: '账号已注销' })
  } catch (error) {
    console.error('注销账号失败:', error)
    return NextResponse.json(
      { error: '注销失败，请稍后重试' },
      { status: 500 }
    )
  }
}
```

---

## Task 5: 个人中心 — 添加注销账号按钮和确认弹窗

**Files:**
- Modify: `src/app/(main)/profile/page.tsx`

- [ ] **Step 1: 添加 Dialog 导入和状态**

在文件顶部的 import 中添加 `Dialog` 相关导入和 `Trash2` 图标：

将 import 部分改为：
```tsx
import {
  User,
  Package,
  Heart,
  Settings,
  LogOut,
  Loader2,
  ChevronRight,
  Shield,
  ArrowLeftRight,
  Trash2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
```

在 `ProfilePage` 组件内，`handleLogout` 函数后面添加状态和处理函数：

```tsx
const [showDeleteDialog, setShowDeleteDialog] = useState(false)
const [deletePassword, setDeletePassword] = useState('')
const [deleteError, setDeleteError] = useState('')
const [deleting, setDeleting] = useState(false)

const handleDeleteAccount = async () => {
  if (!deletePassword) {
    setDeleteError('请输入密码')
    return
  }

  setDeleting(true)
  setDeleteError('')

  try {
    const res = await fetch('/api/users/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword }),
    })

    const data = await res.json()

    if (!res.ok) {
      setDeleteError(data.error || '注销失败')
      setDeleting(false)
      return
    }

    await signOut({ callbackUrl: '/login' })
  } catch {
    setDeleteError('网络错误，请重试')
    setDeleting(false)
  }
}
```

- [ ] **Step 2: 添加注销账号菜单项**

在 `{/* Logout */}` 注释上方，menuItems.map 之后，添加注销账号按钮：

```tsx
{/* Delete Account */}
<button
  onClick={() => setShowDeleteDialog(true)}
  aria-label="注销账号"
  className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-gray-50 transition-colors"
>
  <Trash2 className="w-5 h-5 text-red-500" />
  <span className="text-sm text-red-500">注销账号</span>
</button>
```

- [ ] **Step 3: 添加确认弹窗**

在组件 return 的最末尾，`</div>` 之前，添加 Dialog：

```tsx
{/* Delete Account Dialog */}
<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>注销账号</DialogTitle>
      <DialogDescription>
        此操作将永久删除你的账号及所有数据（发布商品、消息、交易记录等），且不可恢复。
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      <p className="text-sm text-gray-600">请输入密码以确认注销：</p>
      <Input
        type="password"
        placeholder="输入密码"
        value={deletePassword}
        onChange={(e) => setDeletePassword(e.target.value)}
        autoComplete="current-password"
      />
      {deleteError && (
        <p className="text-sm text-red-500">{deleteError}</p>
      )}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setShowDeleteDialog(false)
          setDeletePassword('')
          setDeleteError('')
        }}
      >
        取消
      </Button>
      <Button
        variant="destructive"
        onClick={handleDeleteAccount}
        disabled={deleting}
      >
        {deleting ? '注销中...' : '确认注销'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Task 6: 验证和收尾

- [ ] **Step 1: 启动开发服务器验证**

```bash
cd d:/校园二手交易平台
npm run dev
```

Expected: 服务器正常启动，无编译错误。

- [ ] **Step 2: 验证注册页面**

浏览器访问 `/register`，确认：
- 表单正常显示
- 图片上传区域可见，可选择文件
- 选择图片后显示预览
- 可删除已选图片重新选择
- 未选择图片时提交会报错

- [ ] **Step 3: 验证个人中心页面**

浏览器访问 `/profile`，确认：
- 「注销账号」按钮显示在退出登录下方
- 点击后弹出确认对话框
- 输入错误密码会显示错误
- 对话框可正常关闭
