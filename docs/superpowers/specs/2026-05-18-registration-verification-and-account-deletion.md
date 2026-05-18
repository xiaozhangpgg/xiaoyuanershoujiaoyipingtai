# 注册学信网认证 & 注销账号 设计文档

## 概述

两个功能：
1. 注册时上传学信网截图用于学生认证
2. 个人中心添加注销账号功能（硬删除）

## 方案选择

采用 **方案 B：复用现有上传接口**。注册流程分两步前端编排：先上传截图获取 URL，再提交注册表单附带 URL。不改动现有 `/api/upload` 接口。

---

## 一、数据库变更

User 模型新增一个字段：

```prisma
model User {
  // ... 现有字段
  verificationImage String?  // 学信网截图 URL
}
```

需要创建 Prisma migration。

---

## 二、注册流程

### 前端（`src/app/(auth)/register/page.tsx`）

- 表单新增图片上传区域，位于学号输入框下方
- 支持点击选择和拖拽上传
- 上传后显示缩略图预览，支持删除重选
- 文件限制：仅图片格式（JPG/PNG/WebP/GIF），最大 5MB
- 提交流程：先调用 `/api/upload` 上传截图获取 URL，再提交注册表单（含 `verificationImage` 字段）
- 上传中显示加载状态，禁用注册按钮

### 后端（`src/app/api/register/route.ts`）

- 接收 `verificationImage` 可选字段
- 创建用户时将 `verificationImage` 写入数据库
- `verified` 保持默认 `false`，等待管理员审核

---

## 三、注销账号

### 后端（`src/app/api/users/me/route.ts`）

新增 `DELETE` 方法：

1. 验证用户登录状态
2. 验证密码（从请求体接收 `password` 字段，用 bcrypt 比对）
3. 硬删除顺序（避免外键约束问题）：
   - 删除用户的消息（senderId 或 receiverId）
   - 删除用户的收藏
   - 删除用户的交易记录
   - 删除用户的会话
   - 删除用户发布的商品（含商品图片文件）
   - 删除用户本身
4. 使用 Prisma 事务确保原子性

### 前端（`src/app/(main)/profile/page.tsx`）

- 在「退出登录」按钮下方添加「注销账号」按钮（红色，带 Trash2 图标）
- 点击后弹出 Dialog 确认框：
  - 标题：「注销账号」
  - 警告文案：说明数据将永久删除不可恢复
  - 密码输入框（二次确认）
  - 「取消」和「确认注销」按钮
- 确认后调用 `DELETE /api/users/me`，成功后跳转登录页

---

## 四、涉及文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `prisma/schema.prisma` | 修改 | User 模型添加 `verificationImage` 字段 |
| `prisma/migrations/` | 新增 | migration 文件 |
| `src/app/(auth)/register/page.tsx` | 修改 | 添加图片上传 UI |
| `src/app/api/register/route.ts` | 修改 | 接收并存储 `verificationImage` |
| `src/app/api/users/me/route.ts` | 修改 | 新增 DELETE 方法 |
| `src/app/(main)/profile/page.tsx` | 修改 | 添加注销账号按钮和确认弹窗 |

---

## 五、安全考量

- 注销账号需验证密码，防止他人恶意注销
- 删除操作使用数据库事务，确保数据一致性
- 上传复用现有 `/api/upload` 的安全校验（文件类型魔数验证、大小限制、速率限制）
- 注销接口同样需要速率限制
