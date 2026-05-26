# 校园二手交易平台

一个基于 Next.js 构建的校园二手物品交易平台，支持商品发布、浏览、收藏、站内消息和交易确认等功能。

## 技术栈

- **框架**: [Next.js](https://nextjs.org) 16 + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js v5
- **UI 组件**: shadcn/ui + Base UI
- **实时通信**: Socket.IO

## 功能特性

- 用户注册与登录（支持学号验证）
- 商品发布、编辑与浏览
- 商品分类筛选与搜索
- 商品收藏管理
- 站内私信（基于商品的一对一沟通）
- 交易流程与双方确认
- 个人中心与交易统计
- 响应式移动端适配

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 数据库

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件并配置以下变量：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/campus_marketplace"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 数据库初始化

```bash
# 执行数据库迁移
npx prisma migrate dev

# 可选：填充初始数据
npx prisma db seed
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
├── prisma/              # 数据库 schema 与迁移
├── public/uploads/      # 用户上传文件
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── (auth)/      # 认证相关页面（登录/注册）
│   │   ├── (main)/      # 主站页面（首页/商品/消息/个人中心）
│   │   └── api/         # API 路由
│   ├── components/      # React 组件
│   │   └── ui/          # shadcn/ui 基础组件
│   ├── lib/             # 工具库与配置
│   └── types/           # TypeScript 类型定义
├── docs/                # 项目文档与设计方案
└── docker-compose.yml   # Docker 开发环境
```

## 数据库模型

- **User** - 用户（含学号验证）
- **Product** - 商品（支持多图、成色、状态）
- **Category** - 商品分类
- **Favorite** - 收藏关系
- **Message** - 站内消息
- **Conversation** - 会话管理
- **Transaction** - 交易记录

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 代码检查 |

## Docker 开发环境

```bash
docker-compose up -d
```

## 部署

推荐使用 [Vercel](https://vercel.com) 进行部署，也可通过 Docker 自托管。

## 许可证

MIT
