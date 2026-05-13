'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
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
} from 'lucide-react'

interface UserProfile {
  id: number
  nickname: string
  email: string
  studentId: string
  avatar: string | null
  verified: boolean
}

interface UserStats {
  products: number
  favorites: number
}

export default function ProfilePage() {
  const { status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats>({ products: 0, favorites: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch('/api/users/me'),
        fetch('/api/users/me/stats'),
      ])

      if (!profileRes.ok) {
        if (profileRes.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取用户信息失败')
      }

      const profileData = await profileRes.json()
      setProfile(profileData)

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router, fetchProfile])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" aria-label="加载中" />
        <span className="sr-only">加载中</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <User className="w-16 h-16 mb-4" />
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
        >
          重试
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <User className="w-16 h-16 mb-4" />
        <p className="text-sm mb-4">请先登录</p>
        <Link
          href="/login"
          className="px-4 py-2 text-sm text-white bg-green-500 rounded-full hover:bg-green-600"
        >
          去登录
        </Link>
      </div>
    )
  }

  const menuItems = [
    {
      icon: Package,
      label: '我的发布',
      href: '/profile/products',
      count: stats.products,
    },
    {
      icon: Heart,
      label: '我的收藏',
      href: '/profile/favorites',
      count: stats.favorites,
    },
    {
      icon: ArrowLeftRight,
      label: '我的交易',
      href: '/profile/transactions',
    },
    {
      icon: Settings,
      label: '设置',
      href: '/profile/settings',
    },
  ]

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-green-500 to-green-600 px-6 pt-8 pb-12">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.nickname}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-medium">
                {profile.nickname.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-white truncate">
                {profile.nickname}
              </h1>
              {profile.verified && (
                <Shield className="w-4 h-4 text-green-200" aria-label="已认证" />
              )}
            </div>
            <p className="text-sm text-green-100 mt-0.5">
              学号: {profile.studentId}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around mt-6 bg-white/10 rounded-xl py-3">
          <Link href="/profile/products" className="text-center flex-1">
            <p className="text-xl font-bold text-white">{stats.products}</p>
            <p className="text-xs text-green-100">发布</p>
          </Link>
          <div className="w-px h-8 bg-white/20" />
          <Link href="/profile/favorites" className="text-center flex-1">
            <p className="text-xl font-bold text-white">{stats.favorites}</p>
            <p className="text-xs text-green-100">收藏</p>
          </Link>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-900">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && (
                    <span className="text-sm text-gray-400">{item.count}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            )
          })}

          {/* Logout */}
          <button
            onClick={handleLogout}
            aria-label="退出登录"
            className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-500">退出登录</span>
          </button>
        </div>
      </div>
    </div>
  )
}
