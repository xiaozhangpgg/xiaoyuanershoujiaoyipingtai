export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: [
    '/login',
    '/register',
    '/publish/:path*',
    '/messages/:path*',
    '/profile/:path*',
  ],
}
