import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.nickname,
          image: user.avatar ?? undefined,
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
    authorized({ auth, request }) {
      const isLoggedIn = !!auth
      const { pathname } = request.nextUrl

      // API 路由由 NextAuth handlers 自行处理，不做拦截
      if (pathname.startsWith('/api')) {
        return true
      }

      // 已登录用户访问登录/注册页面时重定向到首页
      if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
        return Response.redirect(new URL('/', request.url))
      }

      // 未登录用户允许访问登录/注册页面
      if (pathname === '/login' || pathname === '/register') {
        return true
      }

      return isLoggedIn
    },
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
})
