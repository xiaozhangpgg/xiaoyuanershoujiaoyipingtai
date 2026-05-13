# 校园二手交易平台实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个面向本校学生的校园二手交易平台，支持商品发布、搜索、即时消息等功能

**Architecture:** Next.js 14 全栈应用，使用 App Router + API Routes + Prisma ORM + PostgreSQL

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, NextAuth.js, Socket.io

---

## Task 1: 项目初始化和基础配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `docker-compose.yml`
- Create: `.env.local`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
npx create-next-app@latest campus-marketplace --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd campus-marketplace
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install prisma @prisma/client next-auth bcryptjs socket.io socket.io-client lucide-react
npm install -D @types/bcryptjs
```

- [ ] **Step 2b: 初始化 shadcn/ui**

```bash
npx shadcn@latest init
# 选择：New York style, Green color, CSS variables: yes
```

```bash
# 安装常用组件
npx shadcn@latest add button card input label dialog tabs avatar badge separator
```

- [ ] **Step 3: 创建 docker-compose.yml**

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    container_name: campus-marketplace-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: campus_marketplace
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 4: 创建环境变量文件**

```bash
# .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campus_marketplace"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 5: 创建 .gitignore**

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# uploads
public/uploads/*
!public/uploads/.gitkeep
```

- [ ] **Step 6: 验证项目启动**

```bash
docker-compose up -d
npm run dev
```

访问 http://localhost:3000 确认项目正常运行

- [ ] **Step 7: 提交代码**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with Docker PostgreSQL"
```

### ✅ Task 1 验收清单

**功能验收点：**
- [ ] Docker PostgreSQL 容器正常运行
- [ ] Next.js 开发服务器正常启动
- [ ] 访问 http://localhost:3000 能看到默认页面
- [ ] 环境变量配置正确

**测试用例：**
```bash
# 1. 验证 Docker 容器运行状态
docker ps | grep campus-marketplace-db
# 预期：容器状态为 Up

# 2. 验证数据库连接
docker exec campus-marketplace-db psql -U postgres -c "\l"
# 预期：能看到 campus_marketplace 数据库

# 3. 验证 Next.js 启动
curl http://localhost:3000
# 预期：返回 HTML 内容，状态码 200

# 4. 验证环境变量
cat .env.local
# 预期：包含 DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

---

## Task 2: 数据库模型和 Prisma 配置

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `prisma/seed.ts`

- [ ] **Step 1: 初始化 Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: 定义数据库模型**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ProductCondition {
  NEW
  LIKE_NEW
  SLIGHTLY_USED
  USED
}

enum ProductStatus {
  ON_SALE
  SOLD
  OFF_SHELF
}

enum TransactionStatus {
  PENDING
  SELLER_CONFIRMED
  COMPLETED
  CANCELLED
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  nickname  String
  avatar    String?
  studentId String   @unique
  verified  Boolean  @default(false)
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

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]
}

model Product {
  id          Int             @id @default(autoincrement())
  title       String
  description String
  price       Float
  images      String[]
  condition   ProductCondition
  location    String
  status      ProductStatus   @default(ON_SALE)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  sellerId   Int
  seller     User     @relation("SellerProducts", fields: [sellerId], references: [id])
  categoryId Int
  category   Category @relation(fields: [categoryId], references: [id])
  favorites    Favorite[]
  messages     Message[]
  transaction  Transaction?
}

model Favorite {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())

  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  productId Int
  product   Product  @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
}

model Message {
  id         Int      @id @default(autoincrement())
  content    String
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())

  senderId   Int
  sender     User     @relation("SentMessages", fields: [senderId], references: [id])
  receiverId Int
  receiver   User     @relation("ReceivedMessages", fields: [receiverId], references: [id])
  productId  Int
  product    Product  @relation(fields: [productId], references: [id])
}

model Conversation {
  id            Int      @id @default(autoincrement())
  lastMessageAt DateTime @default(now())

  user1Id       Int
  user1         User     @relation("User1", fields: [user1Id], references: [id])
  user2Id       Int
  user2         User     @relation("User2", fields: [user2Id], references: [id])
  productId     Int
  product       Product  @relation(fields: [productId], references: [id])

  @@unique([user1Id, user2Id, productId])
}

model Transaction {
  id                Int             @id @default(autoincrement())
  price             Float
  status            TransactionStatus @default(PENDING)
  sellerConfirmedAt DateTime?
  buyerConfirmedAt  DateTime?
  createdAt         DateTime        @default(now())

  productId  Int     @unique
  product    Product @relation(fields: [productId], references: [id])
  sellerId   Int
  seller     User    @relation("SellerTransactions", fields: [sellerId], references: [id])
  buyerId    Int
  buyer      User    @relation("BuyerTransactions", fields: [buyerId], references: [id])
}
```

- [ ] **Step 3: 创建 Prisma 客户端**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: 创建种子数据**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 创建分类
  const categories = ['教材', '数码', '生活用品', '服饰', '其他']
  
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log('Categories seeded successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

- [ ] **Step 5: 运行数据库迁移**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 6: 运行种子数据**

```bash
npx ts-node prisma/seed.ts
```

- [ ] **Step 7: 验证数据库**

```bash
npx prisma studio
```

打开浏览器访问 http://localhost:5555 确认表结构正确

- [ ] **Step 8: 提交代码**

```bash
git add .
git commit -m "feat: add Prisma schema with User, Product, Category, Message, Conversation models"
```

### ✅ Task 2 验收清单

**功能验收点：**
- [ ] Prisma schema 定义正确，包含所有 5 张表
- [ ] 数据库迁移成功执行
- [ ] 种子数据正常插入（5 个分类）
- [ ] Prisma Studio 能正常访问

**测试用例：**
```bash
# 1. 验证 Prisma 迁移
npx prisma migrate status
# 预期：显示 "Database schema is up to date"

# 2. 验证表结构
npx prisma db pull --print
# 预期：包含 User, Product, Category, Message, Conversation 表

# 3. 验证种子数据
npx prisma studio
# 预期：打开浏览器，Category 表中有 5 条记录（教材、数码、生活用品、服饰、其他）

# 4. 验证 Prisma Client 生成
npx prisma generate
# 预期：成功生成 Prisma Client

# 5. 验证数据库连接
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('Connected')).finally(() => prisma.\$disconnect())"
# 预期：输出 "Connected"
```

---

## Task 3: 用户认证系统

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/api/register/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/middleware.ts`

- [ ] **Step 1: 配置 NextAuth**

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.nickname,
          image: user.avatar,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}
```

- [ ] **Step 2: 创建 NextAuth API 路由**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

- [ ] **Step 3: 创建注册 API**

```typescript
// src/app/api/register/route.ts
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
```

- [ ] **Step 4: 创建登录页面**

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('邮箱或密码错误')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-8">校园二手交易</h1>
      
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        
        <div>
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <Link href="/register" className="mt-4 text-green-500">
        没有账号？去注册
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: 创建注册页面**

```tsx
// src/app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
    studentId: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        setLoading(false)
        return
      }

      router.push('/login')
    } catch (err) {
      setError('注册失败，请重试')
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
            value={formData.password}
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
            value={formData.studentId}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* 学信网照片上传 - 暂时注释，后续实现 */}
        {/* <div>
          <input
            type="file"
            accept="image/*"
            className="w-full px-4 py-3 border rounded-lg"
          />
        </div> */}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <Link href="/login" className="mt-4 text-green-500">
        已有账号？去登录
      </Link>
    </div>
  )
}
```

- [ ] **Step 6: 创建 Auth 布局**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
```

- [ ] **Step 7: 创建中间件保护路由**

```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/publish/:path*',
    '/messages/:path*',
    '/profile/:path*',
  ],
}
```

- [ ] **Step 8: 测试认证流程**

```bash
npm run dev
```

1. 访问 http://localhost:3000/register 注册新用户
2. 访问 http://localhost:3000/login 登录
3. 访问 http://localhost:3000/publish 确认需要登录

- [ ] **Step 9: 提交代码**

```bash
git add .
git commit -m "feat: implement user authentication with NextAuth.js"
```

### ✅ Task 3 验收清单

**功能验收点：**
- [ ] 注册页面正常显示，表单验证正确
- [ ] 登录页面正常显示，能正确登录
- [ ] 注册的用户数据正确保存到数据库
- [ ] 密码加密存储（bcrypt）
- [ ] 路由保护生效（未登录访问 /publish 重定向到 /login）

**测试用例：**
```bash
# 1. 测试注册 API
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","nickname":"测试用户","studentId":"2024001"}'
# 预期：返回用户信息，状态码 200

# 2. 测试重复邮箱注册
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","nickname":"测试用户2","studentId":"2024002"}'
# 预期：返回错误 "Email already exists"，状态码 400

# 3. 测试重复学号注册
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"123456","nickname":"测试用户3","studentId":"2024001"}'
# 预期：返回错误 "Student ID already exists"，状态码 400

# 4. 验证数据库中的用户数据
npx prisma studio
# 预期：User 表中有刚注册的用户，密码为 bcrypt 加密格式

# 5. 测试登录页面
# 浏览器访问 http://localhost:3000/login
# 预期：能看到登录表单

# 6. 测试注册页面
# 浏览器访问 http://localhost:3000/register
# 预期：能看到注册表单

# 7. 测试路由保护
# 浏览器访问 http://localhost:3000/publish（未登录状态）
# 预期：重定向到 /login
```

---

## Task 4: 商品管理 API

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`
- Create: `src/app/api/upload/route.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: 定义类型**

```typescript
// src/types/index.ts
export interface Product {
  id: number
  title: string
  description: string
  price: number
  images: string[]
  condition: ProductCondition
  location: string
  status: ProductStatus
  createdAt: Date
  sellerId: number
  categoryId: number
  seller?: User
  category?: Category
}

export interface User {
  id: number
  email: string
  nickname: string
  avatar: string | null
  studentId: string
  verified: boolean
}

export interface Category {
  id: number
  name: string
}

export enum ProductCondition {
  NEW = 'NEW',
  LIKE_NEW = 'LIKE_NEW',
  SLIGHTLY_USED = 'SLIGHTLY_USED',
  USED = 'USED',
}

export enum ProductStatus {
  ON_SALE = 'ON_SALE',
  SOLD = 'SOLD',
  OFF_SHELF = 'OFF_SHELF',
}

export const conditionLabels: Record<ProductCondition, string> = {
  [ProductCondition.NEW]: '全新',
  [ProductCondition.LIKE_NEW]: '几乎全新',
  [ProductCondition.SLIGHTLY_USED]: '轻微使用痕迹',
  [ProductCondition.USED]: '明显使用痕迹',
}
```

- [ ] **Step 2: 创建商品列表 API**

```typescript
// src/app/api/products/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const keyword = searchParams.get('keyword')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const location = searchParams.get('location')

    const where: any = {
      status: 'ON_SALE',
    }

    if (category && category !== '全部') {
      where.category = { name: category }
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
              verified: true,
            },
          },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, price, images, categoryId, condition, location } = body

    // 验证必填字段
    if (!title || !description || !price || !categoryId || !condition || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        images: images || [],
        condition,
        location,
        sellerId: parseInt(session.user.id),
        categoryId: parseInt(categoryId),
      },
      include: {
        seller: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            verified: true,
          },
        },
        category: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 创建单个商品 API**

```typescript
// src/app/api/products/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        seller: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            verified: true,
            studentId: true,
          },
        },
        category: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(params.id) },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.sellerId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, price, images, categoryId, condition, location, status } = body

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(params.id) },
      data: {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        images,
        condition,
        location,
        status,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
      },
      include: {
        seller: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            verified: true,
          },
        },
        category: true,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(params.id) },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.sellerId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.product.delete({
      where: { id: parseInt(params.id) },
    })

    return NextResponse.json({ message: 'Product deleted' })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: 创建文件上传 API**

```typescript
// src/app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 生成唯一文件名
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`
    const path = join(process.cwd(), 'public/uploads', uniqueName)

    await writeFile(path, buffer)

    return NextResponse.json({
      url: `/uploads/${uniqueName}`,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 5: 测试 API**

```bash
# 获取商品列表
curl http://localhost:3000/api/products

# 获取单个商品
curl http://localhost:3000/api/products/1

# 创建商品（需要先登录获取 session）
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"title":"测试商品","description":"测试描述","price":100,"categoryId":1,"condition":"NEW","location":"南区6号楼"}'
```

- [ ] **Step 6: 提交代码**

```bash
git add .
git commit -m "feat: implement product CRUD APIs with file upload"
```

### ✅ Task 4 验收清单

**功能验收点：**
- [ ] 商品列表 API 正常返回数据，支持分页
- [ ] 商品详情 API 正常返回单个商品信息
- [ ] 创建商品 API 正常工作，数据保存到数据库
- [ ] 更新商品 API 正常工作（仅卖家可更新）
- [ ] 删除商品 API 正常工作（仅卖家可删除）
- [ ] 文件上传 API 正常工作，图片保存到 public/uploads
- [ ] 搜索筛选功能正常（关键词、分类、价格、地址）

**测试用例：**
```bash
# 1. 测试获取商品列表（需要先登录获取 session）
curl http://localhost:3000/api/products
# 预期：返回空数组或已有商品，状态码 200

# 2. 测试创建商品（需要先登录）
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"title":"测试商品","description":"测试描述","price":100,"categoryId":1,"condition":"NEW","location":"南区6号楼"}'
# 预期：返回创建的商品信息，状态码 201

# 3. 测试获取单个商品
curl http://localhost:3000/api/products/1
# 预期：返回商品详情，包含卖家信息和分类信息

# 4. 测试更新商品
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"更新后的标题","price":150}'
# 预期：返回更新后的商品信息

# 5. 测试删除商品
curl -X DELETE http://localhost:3000/api/products/1
# 预期：返回成功消息

# 6. 测试文件上传
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/test-image.jpg"
# 预期：返回图片 URL

# 7. 测试搜索功能
curl "http://localhost:3000/api/products?keyword=测试"
# 预期：返回包含关键词的商品

# 8. 测试分类筛选
curl "http://localhost:3000/api/products?category=教材"
# 预期：返回该分类下的商品

# 9. 测试价格筛选
curl "http://localhost:3000/api/products?minPrice=50&maxPrice=200"
# 预期：返回价格在区间的商品

# 10. 测试地址筛选
curl "http://localhost:3000/api/products?location=南区"
# 预期：返回包含地址关键词的商品

# 11. 验证数据库中的商品数据
npx prisma studio
# 预期：Product 表中有创建的商品记录
```

---

## Task 5: 消息 API

**Files:**
- Create: `src/app/api/messages/route.ts`
- Create: `src/app/api/messages/[id]/route.ts`
- Create: `src/app/api/conversations/route.ts`

- [ ] **Step 1: 创建对话列表 API**

```typescript
// src/app/api/conversations/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(session.user.id)

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
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

    // 获取每个对话的最后一条消息
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: conv.user1Id, receiverId: conv.user2Id },
              { senderId: conv.user2Id, receiverId: conv.user1Id },
            ],
            productId: conv.productId,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true,
            senderId: true,
          },
        })

        return {
          ...conv,
          lastMessage,
          otherUser: conv.user1Id === userId ? conv.user2 : conv.user1,
        }
      })
    )

    return NextResponse.json(conversationsWithLastMessage)
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 创建消息列表 API**

```typescript
// src/app/api/messages/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('userId')
    const productId = searchParams.get('productId')

    if (!otherUserId || !productId) {
      return NextResponse.json(
        { error: 'Missing userId or productId' },
        { status: 400 }
      )
    }

    const userId = parseInt(session.user.id)
    const otherId = parseInt(otherUserId)
    const prodId = parseInt(productId)

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherId, productId: prodId },
          { senderId: otherId, receiverId: userId, productId: prodId },
        ],
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
      orderBy: { createdAt: 'asc' },
    })

    // 标记消息为已读
    await prisma.message.updateMany({
      where: {
        senderId: otherId,
        receiverId: userId,
        productId: prodId,
        isRead: false,
      },
      data: { isRead: true },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, receiverId, productId } = body

    if (!content || !receiverId || !productId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const senderId = parseInt(session.user.id)
    const receiver = parseInt(receiverId)
    const product = parseInt(productId)

    // 创建消息
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: receiver,
        productId: product,
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
    })

    // 更新或创建对话
    const [user1Id, user2Id] = senderId < receiver
      ? [senderId, receiver]
      : [receiver, senderId]

    await prisma.conversation.upsert({
      where: {
        user1Id_user2Id_productId: {
          user1Id,
          user2Id,
          productId: product,
        },
      },
      update: {
        lastMessageAt: new Date(),
      },
      create: {
        user1Id,
        user2Id,
        productId: product,
        lastMessageAt: new Date(),
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 测试消息 API**

```bash
# 获取对话列表
curl http://localhost:3000/api/conversations

# 获取消息
curl "http://localhost:3000/api/messages?userId=2&productId=1"

# 发送消息
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"你好，请问还在吗？","receiverId":2,"productId":1}'
```

- [ ] **Step 4: 提交代码**

```bash
git add .
git commit -m "feat: implement messaging APIs with conversations"
```

### ✅ Task 5 验收清单

**功能验收点：**
- [ ] 对话列表 API 正常返回用户的对话列表
- [ ] 消息列表 API 正常返回两个用户之间的消息
- [ ] 发送消息 API 正常工作，消息保存到数据库
- [ ] 对话记录自动创建/更新
- [ ] 消息已读状态正常更新

**测试用例：**
```bash
# 1. 测试发送消息（需要先登录）
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"你好，请问还在吗？","receiverId":2,"productId":1}'
# 预期：返回创建的消息，状态码 201

# 2. 测试获取消息列表
curl "http://localhost:3000/api/messages?userId=2&productId=1"
# 预期：返回消息数组，包含发送者信息

# 3. 测试获取对话列表
curl http://localhost:3000/api/conversations
# 预期：返回对话数组，包含对方用户信息和最后一条消息

# 4. 测试消息已读状态
# 先用用户 A 发送消息给用户 B
# 然后用用户 B 获取消息列表
# 预期：消息的 isRead 字段应为 true

# 5. 测试对话自动创建
# 发送消息后检查 Conversation 表
# 预期：自动创建对话记录

# 6. 验证数据库中的消息数据
npx prisma studio
# 预期：Message 表中有发送的消息
# 预期：Conversation 表中有对应的对话记录
```

---

## Task 6: 交易系统 API

**Files:**
- Create: `src/app/api/transactions/route.ts`
- Create: `src/app/api/transactions/[id]/route.ts`
- Create: `src/app/api/transactions/[id]/confirm/route.ts`

- [ ] **Step 1: 创建交易发起 API（卖家标记已售）**

```typescript
// src/app/api/transactions/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 获取当前用户的交易列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'buyer' | 'seller'
    const status = searchParams.get('status')

    const where: any = {
      OR: [
        { sellerId: userId },
        { buyerId: userId },
      ],
    }

    if (role === 'buyer') {
      where.OR = [{ buyerId: userId }]
    } else if (role === 'seller') {
      where.OR = [{ sellerId: userId }]
    }

    if (status) {
      where.status = status
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
        seller: {
          select: { id: true, nickname: true, avatar: true },
        },
        buyer: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 卖家发起交易（标记已售，选择买家）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sellerId = parseInt(session.user.id)
    const { productId, buyerId, price } = await request.json()

    if (!productId || !buyerId || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 验证商品属于当前卖家且在售
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (product.status !== 'ON_SALE') {
      return NextResponse.json({ error: 'Product is not on sale' }, { status: 400 })
    }

    // 检查是否已有该商品的交易记录
    const existingTransaction = await prisma.transaction.findUnique({
      where: { productId: parseInt(productId) },
    })

    if (existingTransaction) {
      return NextResponse.json({ error: 'Transaction already exists' }, { status: 400 })
    }

    // 创建交易记录，更新商品状态
    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          productId: parseInt(productId),
          sellerId,
          buyerId: parseInt(buyerId),
          price: parseFloat(price),
          status: 'PENDING',
        },
        include: {
          product: { select: { id: true, title: true, images: true } },
          seller: { select: { id: true, nickname: true } },
          buyer: { select: { id: true, nickname: true } },
        },
      }),
      prisma.product.update({
        where: { id: parseInt(productId) },
        data: { status: 'SOLD' },
      }),
    ])

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Create transaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建交易详情 API**

```typescript
// src/app/api/transactions/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        product: { select: { id: true, title: true, images: true, description: true } },
        seller: { select: { id: true, nickname: true, avatar: true } },
        buyer: { select: { id: true, nickname: true, avatar: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const userId = parseInt(session.user.id)
    if (transaction.sellerId !== userId && transaction.buyerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Get transaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 创建交易确认 API（买家确认完成 / 取消）**

```typescript
// src/app/api/transactions/[id]/confirm/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { action } = await request.json() // 'confirm' | 'cancel'

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(params.id) },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // 只有买家可以确认交易完成
    if (action === 'confirm') {
      if (transaction.buyerId !== userId) {
        return NextResponse.json({ error: 'Only buyer can confirm' }, { status: 403 })
      }

      if (transaction.status !== 'PENDING') {
        return NextResponse.json({ error: 'Invalid transaction status' }, { status: 400 })
      }

      const updated = await prisma.transaction.update({
        where: { id: parseInt(params.id) },
        data: {
          status: 'COMPLETED',
          buyerConfirmedAt: new Date(),
        },
        include: {
          product: { select: { id: true, title: true } },
          seller: { select: { id: true, nickname: true } },
          buyer: { select: { id: true, nickname: true } },
        },
      })

      return NextResponse.json(updated)
    }

    // 买卖双方都可以取消（仅 PENDING 状态）
    if (action === 'cancel') {
      if (transaction.sellerId !== userId && transaction.buyerId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (transaction.status !== 'PENDING') {
        return NextResponse.json({ error: 'Cannot cancel completed transaction' }, { status: 400 })
      }

      const [updated] = await prisma.$transaction([
        prisma.transaction.update({
          where: { id: parseInt(params.id) },
          data: { status: 'CANCELLED' },
        }),
        prisma.product.update({
          where: { id: transaction.productId },
          data: { status: 'ON_SALE' },
        }),
      ])

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Confirm transaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 创建用户搜索 API（卖家选择买家时使用）**

```typescript
// src/app/api/users/search/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')

    if (!keyword) {
      return NextResponse.json({ error: 'Missing keyword' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: parseInt(session.user.id) } },
          {
            OR: [
              { nickname: { contains: keyword, mode: 'insensitive' } },
              { studentId: { contains: keyword } },
            ],
          },
        ],
      },
      select: {
        id: true,
        nickname: true,
        studentId: true,
        avatar: true,
      },
      take: 20,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Search users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: 测试交易 API**

```bash
# 卖家发起交易
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"buyerId":2,"price":80}'

# 获取交易列表
curl http://localhost:3000/api/transactions

# 买家确认交易完成
curl -X POST http://localhost:3000/api/transactions/1/confirm \
  -H "Content-Type: application/json" \
  -d '{"action":"confirm"}'

# 取消交易
curl -X POST http://localhost:3000/api/transactions/1/confirm \
  -H "Content-Type: application/json" \
  -d '{"action":"cancel"}'
```

- [ ] **Step 6: 提交代码**

```bash
git add .
git commit -m "feat: implement transaction system with buyer-seller confirmation flow"
```

### ✅ Task 6 验收清单

**功能验收点：**
- [ ] 卖家能发起交易（选择买家、填写成交价格）
- [ ] 发起交易后商品状态自动变为已售
- [ ] 买家能查看待确认的交易
- [ ] 买家确认后交易状态变为已完成
- [ ] 买卖双方都能取消交易（仅 PENDING 状态）
- [ ] 取消交易后商品状态恢复为在售
- [ ] 不能对已售商品重复发起交易
- [ ] 非交易相关方无法操作交易

**测试用例：**
```bash
# 1. 测试卖家发起交易
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"buyerId":2,"price":80}'
# 预期：返回交易记录，状态为 PENDING

# 2. 验证商品状态
curl http://localhost:3000/api/products/1
# 预期：商品状态为 SOLD

# 3. 测试重复发起交易
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"buyerId":3,"price":90}'
# 预期：返回错误 "Transaction already exists"

# 4. 测试买家确认交易
curl -X POST http://localhost:3000/api/transactions/1/confirm \
  -H "Content-Type: application/json" \
  -d '{"action":"confirm"}'
# 预期：交易状态变为 COMPLETED

# 5. 测试取消交易（发起新交易后测试）
curl -X POST http://localhost:3000/api/transactions/2/confirm \
  -H "Content-Type: application/json" \
  -d '{"action":"cancel"}'
# 预期：交易状态变为 CANCELLED，商品状态恢复为 ON_SALE

# 6. 测试用户搜索
curl "http://localhost:3000/api/users/search?keyword=张"
# 预期：返回匹配的用户列表
```

---

## Task 7: 前端页面 - 首页和商品列表

**Files:**
- Create: `src/app/(main)/layout.tsx`
- Create: `src/app/(main)/page.tsx`
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/ProductCard.tsx`
- Create: `src/components/CategoryNav.tsx`
- Create: `src/components/SearchBar.tsx`

- [ ] **Step 1: 创建主布局**

```tsx
// src/app/(main)/layout.tsx
import { BottomNav } from '@/components/BottomNav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: 创建底部导航**

```tsx
// src/components/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, MessageCircle, User } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/publish', icon: Plus, label: '发布' },
  { href: '/messages', icon: MessageCircle, label: '消息' },
  { href: '/profile', icon: User, label: '我的' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-green-500' : 'text-gray-500'
              }`}
            >
              <item.icon size={24} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: 创建搜索栏**

```tsx
// src/components/SearchBar.tsx
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function SearchBar() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      router.push(`/?keyword=${encodeURIComponent(keyword)}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="sticky top-0 z-40 bg-white p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="搜索商品"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
    </form>
  )
}
```

- [ ] **Step 4: 创建分类导航**

```tsx
// src/components/CategoryNav.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const categories = ['全部', '教材', '数码', '生活用品', '服饰', '其他']

export function CategoryNav() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || '全部'

  const handleCategoryChange = (category: string) => {
    if (category === '全部') {
      router.push('/')
    } else {
      router.push(`/?category=${encodeURIComponent(category)}`)
    }
  }

  return (
    <div className="overflow-x-auto whitespace-nowrap px-4 py-2 bg-white">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => handleCategoryChange(category)}
          className={`inline-block px-4 py-2 mr-2 rounded-full text-sm ${
            currentCategory === category
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 创建商品卡片**

```tsx
// src/components/ProductCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="block">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="relative aspect-square">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">暂无图片</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium line-clamp-2">{product.title}</h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-red-500 font-bold">¥{product.price}</span>
            <span className="text-xs text-gray-400">{product.location}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 6: 创建首页**

```tsx
// src/app/(main)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SearchBar } from '@/components/SearchBar'
import { CategoryNav } from '@/components/CategoryNav'
import { ProductCard } from '@/components/ProductCard'
import { Product } from '@/types'

export default function HomePage() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const category = searchParams.get('category')
  const keyword = searchParams.get('keyword')

  useEffect(() => {
    fetchProducts()
  }, [category, keyword, page])

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (keyword) params.set('keyword', keyword)
      params.set('page', page.toString())
      params.set('limit', '20')

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()

      if (page === 1) {
        setProducts(data.products)
      } else {
        setProducts((prev) => [...prev, ...data.products])
      }

      setHasMore(page < data.totalPages)
    } catch (error) {
      console.error('Fetch products error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1)
    }
  }

  return (
    <div>
      <SearchBar />
      <CategoryNav />
      
      <div className="grid grid-cols-2 gap-3 p-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {loading && (
        <div className="text-center py-4">加载中...</div>
      )}

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="w-full py-4 text-green-500"
        >
          加载更多
        </button>
      )}

      {!hasMore && products.length > 0 && (
        <div className="text-center py-4 text-gray-400">
          没有更多了
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          暂无商品
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: 测试首页**

```bash
npm run dev
```

访问 http://localhost:3000 确认：
1. 搜索栏显示正常
2. 分类标签可横向滚动
3. 商品卡片双列显示
4. 底部导航栏显示正常

- [ ] **Step 8: 提交代码**

```bash
git add .
git commit -m "feat: implement homepage with search, categories, and product grid"
```

### ✅ Task 6 验收清单

**功能验收点：**
- [ ] 首页正常显示，搜索栏、分类导航、商品列表布局正确
- [ ] 底部导航栏正常显示，4 个 Tab（首页、发布、消息、我的）
- [ ] 搜索功能正常：输入关键词点击搜索，显示匹配商品
- [ ] 分类筛选功能正常：点击分类标签，显示该分类商品
- [ ] 商品卡片显示正常：图片、标题、价格、位置
- [ ] 分页加载功能正常：点击"加载更多"加载下一页
- [ ] 移动端适配良好（375px 宽度）

**测试用例：**
```
1. 访问 http://localhost:3000
   - 预期：首页正常显示，搜索栏在顶部，分类标签横向滚动，商品卡片双列显示

2. 测试搜索功能
   - 在搜索栏输入关键词，点击搜索
   - 预期：URL 变为 /?keyword=xxx，商品列表刷新显示匹配商品

3. 测试分类筛选
   - 点击"教材"分类标签
   - 预期：URL 变为 /?category=教材，商品列表刷新显示教材类商品

4. 测试分类切换
   - 点击"全部"分类标签
   - 预期：URL 变为 /，显示所有商品

5. 测试商品卡片点击
   - 点击某个商品卡片
   - 预期：跳转到商品详情页 /products/[id]

6. 测试底部导航
   - 点击"发布"Tab
   - 预期：跳转到 /publish

7. 测试分页加载
   - 滚动到底部，点击"加载更多"
   - 预期：加载更多商品，商品列表增加

8. 测试响应式布局
   - 调整浏览器宽度为 375px
   - 预期：布局适配移动端，商品卡片双列显示
```

---

## Task 8: 前端页面 - 商品详情和发布

**Files:**
- Create: `src/app/(main)/products/[id]/page.tsx`
- Create: `src/app/(main)/publish/page.tsx`
- Create: `src/components/MarkSoldModal.tsx`

- [ ] **Step 1: 创建商品详情页**

```tsx
// src/app/(main)/products/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { Product, conditionLabels } from '@/types'
import { ArrowLeft, Heart, MessageCircle, MapPin, Clock, Tag } from 'lucide-react'
import { MarkSoldModal } from '@/components/MarkSoldModal'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [showMarkSoldModal, setShowMarkSoldModal] = useState(false)

  const isSeller = session?.user?.id && product?.sellerId === parseInt(session.user.id as string)

  useEffect(() => {
    fetchProduct()
  }, [params.id])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`)
      if (!response.ok) {
        router.push('/')
        return
      }
      const data = await response.json()
      setProduct(data)
    } catch (error) {
      console.error('Fetch product error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContact = () => {
    if (!session) {
      router.push('/login')
      return
    }
    router.push(`/messages/${product?.sellerId}?productId=${product?.id}`)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  if (!product) {
    return <div className="flex items-center justify-center min-h-screen">商品不存在</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium">商品详情</h1>
      </div>

      {/* 图片轮播 */}
      <div className="relative aspect-square bg-gray-200">
        {product.images.length > 0 ? (
          <>
            <Image
              src={product.images[currentImage]}
              alt={product.title}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {product.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-2 h-2 rounded-full ${
                    currentImage === index ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400">暂无图片</span>
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <div className="bg-white p-4 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-red-500">¥{product.price}</span>
          <span className="text-sm text-gray-400">
            {conditionLabels[product.condition]}
          </span>
        </div>
        <h2 className="text-lg font-medium mb-4">{product.title}</h2>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin size={16} />
            <span>{product.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{new Date(product.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 商品描述 */}
      <div className="bg-white p-4 mb-2">
        <h3 className="font-medium mb-2">商品描述</h3>
        <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
      </div>

      {/* 卖家信息 */}
      <div className="bg-white p-4 mb-2">
        <h3 className="font-medium mb-2">卖家信息</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            {product.seller?.avatar ? (
              <Image
                src={product.seller.avatar}
                alt={product.seller.nickname}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <span className="text-gray-400">头像</span>
            )}
          </div>
          <div>
            <p className="font-medium">{product.seller?.nickname}</p>
            {product.seller?.verified && (
              <span className="text-xs text-green-500">已认证</span>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex gap-4 max-w-lg mx-auto">
          {isSeller ? (
            product.status === 'ON_SALE' && (
              <button
                onClick={() => setShowMarkSoldModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-lg"
              >
                <Tag size={20} />
                <span>标记已售</span>
              </button>
            )
          ) : (
            <>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg">
                <Heart size={20} />
                <span>收藏</span>
              </button>
              <button
                onClick={handleContact}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-lg"
              >
                <MessageCircle size={20} />
                <span>联系卖家</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 标记已售弹窗 */}
      {showMarkSoldModal && (
        <MarkSoldModal
          productId={product.id}
          onClose={() => setShowMarkSoldModal(false)}
          onSuccess={() => {
            setShowMarkSoldModal(false)
            fetchProduct()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建发布商品页**

```tsx
// src/app/(main)/publish/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { ProductCondition, conditionLabels } from '@/types'

interface Category {
  id: number
  name: string
}

export default function PublishPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    categoryId: '',
    condition: '' as ProductCondition | '',
    location: '',
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Fetch categories error:', error)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      if (images.length >= 9) break

      const formData = new FormData()
      formData.append('file', files[i])

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await response.json()
        if (data.url) {
          setImages((prev) => [...prev, data.url])
        }
      } catch (error) {
        console.error('Upload error:', error)
      }
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          categoryId: parseInt(formData.categoryId),
          images,
        }),
      })

      if (response.ok) {
        const product = await response.json()
        router.push(`/products/${product.id}`)
      } else {
        alert('发布失败，请重试')
      }
    } catch (error) {
      console.error('Publish error:', error)
      alert('发布失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium">发布商品</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* 图片上传 */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative w-20 h-20">
                <img
                  src={image}
                  alt={`图片 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500">
                <Plus size={24} className="text-gray-400" />
                <span className="text-xs text-gray-400">添加图片</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            最多上传9张图片
          </p>
        </div>

        {/* 标题 */}
        <div className="bg-white rounded-lg p-4">
          <input
            type="text"
            placeholder="请输入商品标题"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full text-lg focus:outline-none"
            required
          />
        </div>

        {/* 价格 */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">¥</span>
            <input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full text-lg focus:outline-none"
              required
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* 分类 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3">分类</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setFormData({ ...formData, categoryId: category.id.toString() })}
                className={`px-4 py-2 rounded-full text-sm ${
                  formData.categoryId === category.id.toString()
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* 新旧程度 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3">新旧程度</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(conditionLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, condition: value as ProductCondition })}
                className={`px-4 py-2 rounded-full text-sm ${
                  formData.condition === value
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 物品位置 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3">物品位置</h3>
          <input
            type="text"
            placeholder="如：南区6号楼、图书馆附近"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full focus:outline-none"
            required
          />
        </div>

        {/* 描述 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3">商品描述</h3>
          <textarea
            placeholder="请输入商品描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full h-32 focus:outline-none resize-none"
            required
          />
        </div>

        {/* 发布按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '发布中...' : '发布商品'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: 创建标记已售弹窗组件**

```tsx
// src/components/MarkSoldModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface User {
  id: number
  nickname: string
  studentId: string
  avatar: string | null
}

interface MarkSoldModalProps {
  productId: number
  onClose: () => void
  onSuccess: () => void
}

export function MarkSoldModal({ productId, onClose, onSuccess }: MarkSoldModalProps) {
  const [keyword, setKeyword] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [selectedBuyer, setSelectedBuyer] = useState<User | null>(null)
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (keyword.trim()) {
      const timer = setTimeout(() => searchUsers(), 300)
      return () => clearTimeout(timer)
    } else {
      setUsers([])
    }
  }, [keyword])

  const searchUsers = async () => {
    setSearching(true)
    try {
      const response = await fetch(`/api/users/search?keyword=${encodeURIComponent(keyword)}`)
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Search users error:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedBuyer || !price) return

    setLoading(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          buyerId: selectedBuyer.id,
          price: parseFloat(price),
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        alert('操作失败，请重试')
      }
    } catch (error) {
      console.error('Mark sold error:', error)
      alert('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">标记已售</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        {/* 搜索买家 */}
        <div>
          <label className="text-sm text-gray-500 mb-2 block">选择买家</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索学号或昵称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 搜索结果 */}
          {users.length > 0 && !selectedBuyer && (
            <div className="mt-2 bg-white border rounded-lg divide-y max-h-40 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedBuyer(user)
                    setKeyword('')
                    setUsers([])
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {user.nickname[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.nickname}</p>
                    <p className="text-xs text-gray-400">{user.studentId}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 已选买家 */}
          {selectedBuyer && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs">
                  {selectedBuyer.nickname[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedBuyer.nickname}</p>
                  <p className="text-xs text-gray-500">{selectedBuyer.studentId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBuyer(null)} className="text-gray-400">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* 成交价格 */}
        <div>
          <label className="text-sm text-gray-500 mb-2 block">成交价格</label>
          <div className="flex items-center gap-2">
            <span className="text-lg">¥</span>
            <input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* 确认按钮 */}
        <button
          onClick={handleSubmit}
          disabled={!selectedBuyer || !price || loading}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '提交中...' : '确认出售'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 测试页面**

```bash
npm run dev
```

1. 访问 http://localhost:3000/products/1 测试商品详情页
2. 访问 http://localhost:3000/publish 测试发布页
3. 以卖家身份访问商品详情页，确认"标记已售"按钮显示

- [ ] **Step 5: 提交代码**

```bash
git add .
git commit -m "feat: implement product detail, publish pages, and mark-sold modal"
```

### ✅ Task 8 验收清单

**功能验收点：**
- [ ] 商品详情页正常显示：图片轮播、价格、标题、新旧程度、位置、描述、卖家信息
- [ ] 图片轮播功能正常：左右滑动切换图片
- [ ] 收藏按钮功能正常（预留）
- [ ] 联系卖家按钮功能正常：跳转到聊天页
- [ ] 发布商品页正常显示：图片上传、标题、价格、分类、新旧程度、位置、描述
- [ ] 图片上传功能正常：支持多张图片上传，最多 9 张
- [ ] 分类选择功能正常：显示所有分类，可选择
- [ ] 新旧程度选择功能正常：显示所有选项，可选择
- [ ] 表单验证正确：必填字段不能为空
- [ ] 发布成功后跳转到商品详情页

**测试用例：**
```
1. 访问 http://localhost:3000/products/1
   - 预期：商品详情页正常显示，包含图片、价格、标题等信息

2. 测试图片轮播
   - 点击图片下方的指示点
   - 预期：切换到对应图片

3. 测试返回按钮
   - 点击左上角返回按钮
   - 预期：返回上一页

4. 测试联系卖家按钮
   - 点击"联系卖家"按钮（需先登录）
   - 预期：跳转到聊天页 /messages/[sellerId]?productId=[productId]

5. 访问 http://localhost:3000/publish
   - 预期：发布商品页正常显示

6. 测试图片上传
   - 点击"添加图片"，选择图片上传
   - 预期：图片上传成功，显示预览

7. 测试图片删除
   - 点击图片右上角的 X 按钮
   - 预期：图片从列表中移除

8. 测试分类选择
   - 点击"教材"分类按钮
   - 预期：按钮高亮显示，其他按钮恢复默认

9. 测试新旧程度选择
   - 点击"全新"按钮
   - 预期：按钮高亮显示，其他按钮恢复默认

10. 测试表单验证
    - 不填写标题，点击"发布商品"
    - 预期：浏览器提示"请填写此字段"

11. 测试发布商品
    - 填写所有必填字段，点击"发布商品"
    - 预期：发布成功，跳转到商品详情页
```

---

## Task 9: 前端页面 - 消息、交易和个人中心

**Files:**
- Create: `src/app/(main)/messages/page.tsx`
- Create: `src/app/(main)/messages/[id]/page.tsx`
- Create: `src/app/(main)/profile/transactions/page.tsx`
- Create: `src/app/(main)/profile/page.tsx`

- [ ] **Step 1: 创建消息列表页**

```tsx
// src/app/(main)/messages/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

interface Conversation {
  id: number
  otherUser: {
    id: number
    nickname: string
    avatar: string | null
  }
  product: {
    id: number
    title: string
    images: string[]
  }
  lastMessage: {
    content: string
    createdAt: string
    senderId: number
  } | null
}

export default function MessagesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchConversations()
    }
  }, [session])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Fetch conversations error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClick = (conversation: Conversation) => {
    router.push(`/messages/${conversation.otherUser.id}?productId=${conversation.product.id}`)
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>请先登录</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white px-4 py-3">
        <h1 className="text-lg font-medium">消息中心</h1>
      </div>

      {/* 对话列表 */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            暂无消息
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleClick(conversation)}
              className="bg-white px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                {conversation.otherUser.avatar ? (
                  <Image
                    src={conversation.otherUser.avatar}
                    alt={conversation.otherUser.nickname}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-gray-400">头像</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{conversation.otherUser.nickname}</span>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-400">
                      {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {conversation.lastMessage?.content || '暂无消息'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  关于：{conversation.product.title}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建聊天页**

```tsx
// src/app/(main)/messages/[id]/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Send } from 'lucide-react'

interface Message {
  id: number
  content: string
  senderId: number
  createdAt: string
  sender: {
    id: number
    nickname: string
    avatar: string | null
  }
}

export default function ChatPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const otherUserId = params.id as string
  const productId = searchParams.get('productId')

  useEffect(() => {
    if (session && productId) {
      fetchMessages()
      fetchOtherUser()
    }
  }, [session, productId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/messages?userId=${otherUserId}&productId=${productId}`
      )
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Fetch messages error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOtherUser = async () => {
    try {
      const response = await fetch(`/api/users/${otherUserId}`)
      const data = await response.json()
      setOtherUser(data)
    } catch (error) {
      console.error('Fetch user error:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !productId) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          receiverId: parseInt(otherUserId),
          productId: parseInt(productId),
        }),
      })

      if (response.ok) {
        const message = await response.json()
        setMessages((prev) => [...prev, message])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Send message error:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center border-b">
        <button onClick={() => router.back()} className="mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium">
          {otherUser?.nickname || '聊天'}
        </h1>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            开始聊天吧
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === parseInt(session?.user?.id || '0')
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    isMine
                      ? 'bg-green-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMine ? 'text-green-100' : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSend} className="bg-white border-t p-4">
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            type="text"
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: 创建我的交易页**

```tsx
// src/app/(main)/profile/transactions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Check, X, Clock } from 'lucide-react'
import Image from 'next/image'

interface Transaction {
  id: number
  price: number
  status: 'PENDING' | 'SELLER_CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  product: {
    id: number
    title: string
    images: string[]
  }
  seller: { id: number; nickname: string; avatar: string | null }
  buyer: { id: number; nickname: string; avatar: string | null }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待买家确认', color: 'text-orange-500 bg-orange-50' },
  SELLER_CONFIRMED: { label: '待买家确认', color: 'text-orange-500 bg-orange-50' },
  COMPLETED: { label: '已完成', color: 'text-green-500 bg-green-50' },
  CANCELLED: { label: '已取消', color: 'text-gray-500 bg-gray-50' },
}

export default function TransactionsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tab, setTab] = useState<'bought' | 'sold'>('bought')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) fetchTransactions()
  }, [session, tab])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/transactions?role=${tab}`)
      const data = await response.json()
      setTransactions(data)
    } catch (error) {
      console.error('Fetch transactions error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (transactionId: number, action: 'confirm' | 'cancel') => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        fetchTransactions()
      }
    } catch (error) {
      console.error('Confirm transaction error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium">我的交易</h1>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white flex border-b">
        <button
          onClick={() => setTab('bought')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            tab === 'bought' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500'
          }`}
        >
          买入记录
        </button>
        <button
          onClick={() => setTab('sold')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            tab === 'sold' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500'
          }`}
        >
          卖出记录
        </button>
      </div>

      {/* 交易列表 */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">暂无交易记录</div>
        ) : (
          transactions.map((t) => {
            const status = statusLabels[t.status]
            const otherUser = tab === 'bought' ? t.seller : t.buyer
            return (
              <div key={t.id} className="bg-white p-4">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                    {t.product.images[0] && (
                      <Image
                        src={t.product.images[0]}
                        alt={t.product.title}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.product.title}</p>
                    <p className="text-red-500 font-bold">¥{t.price}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {otherUser.nickname} · {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 买家待确认操作 */}
                {tab === 'bought' && t.status === 'PENDING' && (
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleConfirm(t.id, 'cancel')}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      有问题
                    </button>
                    <button
                      onClick={() => handleConfirm(t.id, 'confirm')}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm"
                    >
                      确认完成
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建个人中心页**

```tsx
// src/app/(main)/profile/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { User, Package, Heart, Settings, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ products: 0, favorites: 0 })

  useEffect(() => {
    if (session) {
      fetchUserProfile()
      fetchStats()
    }
  }, [session])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/users/me')
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Fetch user error:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/users/me/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Fetch stats error:', error)
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>请先登录</p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2 bg-green-500 text-white rounded-lg"
        >
          去登录
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white px-4 py-3">
        <h1 className="text-lg font-medium">我的</h1>
      </div>

      {/* 用户信息 */}
      <div className="bg-white p-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.nickname}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-medium">{user?.nickname}</h2>
            <p className="text-sm text-gray-500">学号：{user?.studentId}</p>
            {user?.verified ? (
              <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                已认证
              </span>
            ) : (
              <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                未认证
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white p-4 mb-2">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/profile/products')}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50"
          >
            <Package size={24} className="text-green-500 mb-2" />
            <span className="text-2xl font-bold">{stats.products}</span>
            <span className="text-sm text-gray-500">我发布的</span>
          </button>
          <button
            onClick={() => router.push('/profile/favorites')}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50"
          >
            <Heart size={24} className="text-red-500 mb-2" />
            <span className="text-2xl font-bold">{stats.favorites}</span>
            <span className="text-sm text-gray-500">我的收藏</span>
          </button>
        </div>
      </div>

      {/* 功能列表 */}
      <div className="bg-white divide-y divide-gray-100">
        <button
          onClick={() => router.push('/profile/settings')}
          className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50"
        >
          <Settings size={20} className="text-gray-500" />
          <span>设置</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 text-red-500"
        >
          <LogOut size={20} />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 创建用户 API**

```typescript
// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(params.id) },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        verified: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: 测试页面**

```bash
npm run dev
```

1. 访问 http://localhost:3000/messages 测试消息列表
2. 访问 http://localhost:3000/messages/1?productId=1 测试聊天页
3. 访问 http://localhost:3000/profile 测试个人中心
4. 访问 http://localhost:3000/profile/transactions 测试交易记录页
5. 测试买入/卖出 Tab 切换
6. 测试买家确认交易和取消交易功能

- [ ] **Step 7: 提交代码**

```bash
git add .
git commit -m "feat: implement messages, chat, transactions, and profile pages"
```

### ✅ Task 9 验收清单

**功能验收点：**
- [ ] 消息列表页正常显示：对话列表、对方头像、昵称、最后消息、时间
- [ ] 对话列表按最后消息时间排序
- [ ] 点击对话跳转到聊天页
- [ ] 聊天页正常显示：顶部导航、消息气泡、底部输入框
- [ ] 消息气泡样式正确：自己的消息靠右绿色，对方的消息靠左白色
- [ ] 发送消息功能正常：输入消息点击发送，消息显示在聊天窗口
- [ ] 消息自动滚动到底部
- [ ] 我的交易页正常显示：买入/卖出 Tab 切换
- [ ] 交易记录显示正确：商品信息、价格、状态、对方信息
- [ ] 买家能确认交易完成
- [ ] 买家能取消交易
- [ ] 个人中心页正常显示：头像、昵称、学号、认证状态、统计数据
- [ ] 我的发布数量统计正确
- [ ] 我的收藏数量统计正确
- [ ] 退出登录功能正常

**测试用例：**
```
1. 访问 http://localhost:3000/messages（需先登录）
   - 预期：消息列表页正常显示，如果有对话则显示对话列表

2. 测试空消息列表
   - 如果没有对话记录
   - 预期：显示"暂无消息"

3. 测试点击对话
   - 点击某个对话
   - 预期：跳转到聊天页 /messages/[userId]?productId=[productId]

4. 访问 http://localhost:3000/messages/[userId]?productId=[productId]
   - 预期：聊天页正常显示，消息气泡样式正确

5. 测试发送消息
   - 在输入框输入消息，点击发送按钮
   - 预期：消息显示在聊天窗口，输入框清空

6. 测试消息气泡样式
   - 自己的消息：靠右，绿色背景，圆角
   - 对方的消息：靠左，白色背景，圆角

7. 测试消息自动滚动
   - 发送多条消息
   - 预期：聊天窗口自动滚动到底部

8. 访问 http://localhost:3000/profile/transactions（需先登录）
   - 预期：交易记录页正常显示，默认显示买入记录

9. 测试买入/卖出 Tab 切换
   - 点击"卖出记录" Tab
   - 预期：显示卖家视角的交易记录

10. 测试买家确认交易
    - 对 PENDING 状态的交易点击"确认完成"
    - 预期：交易状态变为 COMPLETED

11. 测试买家取消交易
    - 对 PENDING 状态的交易点击"有问题"
    - 预期：交易状态变为 CANCELLED，商品恢复在售

12. 访问 http://localhost:3000/profile（需先登录）
    - 预期：个人中心页正常显示

13. 测试用户信息显示
    - 预期：显示头像、昵称、学号、认证状态

14. 测试统计数据
    - 预期：显示"我发布的"和"我的收藏"数量

15. 测试退出登录
    - 点击"退出登录"按钮
    - 预期：跳转到登录页
```

---

## Task 10: 最终测试和优化

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/loading.tsx`
- Create: `src/app/error.tsx`

- [ ] **Step 1: 更新根布局**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '校园二手交易',
  description: '面向本校学生的二手交易平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AuthProvider>
          <div className="max-w-lg mx-auto min-h-screen bg-gray-50">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: 创建 AuthProvider**

```tsx
// src/components/AuthProvider.tsx
'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

- [ ] **Step 3: 创建全局加载状态**

```tsx
// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
    </div>
  )
}
```

- [ ] **Step 4: 创建全局错误处理**

```tsx
// src/app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-medium">出错了</h2>
      <p className="text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-green-500 text-white rounded-lg"
      >
        重试
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 创建分类 API**

```typescript
// src/app/api/categories/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: 创建用户统计 API**

```typescript
// src/app/api/users/me/stats/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(session.user.id)

    const [products, favorites] = await Promise.all([
      prisma.product.count({
        where: { sellerId: userId },
      }),
      prisma.favorite.count({
        where: { userId },
      }),
    ])

    return NextResponse.json({ products, favorites })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 7: 完整测试**

```bash
npm run dev
```

测试所有功能：
1. 注册新用户
2. 登录
3. 发布商品
4. 浏览商品列表
5. 搜索商品
6. 查看商品详情
7. 发送消息
8. 卖家标记已售（选择买家、填写成交价）
9. 买家确认交易完成
10. 查看交易记录
11. 取消交易测试（商品恢复在售）
12. 查看个人中心

- [ ] **Step 8: 最终提交**

```bash
git add .
git commit -m "feat: complete campus marketplace with all features including transaction flow"
```

### ✅ Task 10 验收清单

**功能验收点：**
- [ ] 根布局正常：AuthProvider 包裹，移动端适配（max-w-lg）
- [ ] 全局加载状态正常：显示绿色旋转加载图标
- [ ] 全局错误处理正常：显示错误信息和重试按钮
- [ ] 分类 API 正常：返回所有分类
- [ ] 用户统计 API 正常：返回发布数量和收藏数量
- [ ] 交易系统正常：卖家标记已售、买家确认、取消交易
- [ ] 所有页面样式统一：绿色主题色、圆角、间距一致
- [ ] 无控制台错误
- [ ] 无 TypeScript 类型错误

**测试用例：**
```
1. 测试全局加载状态
   - 访问任意页面，观察加载状态
   - 预期：显示绿色旋转加载图标

2. 测试全局错误处理
   - 模拟 API 错误（如断开数据库连接）
   - 预期：显示错误信息和重试按钮

3. 测试分类 API
   - 访问 http://localhost:3000/api/categories
   - 预期：返回分类数组

4. 测试用户统计 API
   - 访问 http://localhost:3000/api/users/me/stats（需先登录）
   - 预期：返回 { products: 数量, favorites: 数量 }

5. 完整流程测试（含交易）
   - 注册用户 A 和用户 B
   - 用户 A 登录并发布商品
   - 用户 B 登录，浏览商品，联系卖家
   - 用户 A 和 B 互相发送消息协商
   - 用户 A（卖家）标记已售，选择用户 B 为买家，填写成交价
   - 验证商品状态变为已售
   - 用户 B 查看交易记录，确认交易完成
   - 验证交易状态变为 COMPLETED
   - 查看个人中心，退出登录

6. 测试取消交易流程
   - 用户 A 发布新商品并标记已售给用户 B
   - 用户 B 取消交易
   - 验证商品状态恢复为在售

6. 测试移动端适配
   - 调整浏览器宽度为 375px
   - 访问所有页面
   - 预期：所有页面布局适配移动端

7. 测试控制台错误
   - 打开浏览器开发者工具
   - 访问所有页面
   - 预期：无红色错误信息

8. 测试 TypeScript 编译
   - 运行 npm run build
   - 预期：编译成功，无类型错误
```

---

## 计划完成

实现计划已完成并保存到 `docs/superpowers/plans/2026-05-10-campus-marketplace.md`。

**两种执行方式：**

**1. Subagent-Driven（推荐）** - 每个任务分配给独立的子代理执行，任务间进行审查，快速迭代

**2. Inline Execution** - 在当前会话中执行任务，批量执行并设置检查点

**选择哪种方式？**
