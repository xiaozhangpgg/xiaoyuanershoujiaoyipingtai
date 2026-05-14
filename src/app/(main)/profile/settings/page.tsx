'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Loader2,
  Camera,
  User,
} from 'lucide-react'

interface UserProfile {
  id: number
  nickname: string
  email: string
  studentId: string
  avatar: string | null
  verified: boolean
}

export default function SettingsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/me')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取用户信息失败')
      }
      const data = await res.json()
      setProfile(data)
      setNickname(data.nickname)
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

  const handleSave = async () => {
    if (!nickname.trim() || saving) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存失败')
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || uploading) return

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error || '上传失败')
      }
      const { url } = await uploadRes.json()

      const patchRes = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      })
      if (!patchRes.ok) {
        throw new Error('更新头像失败')
      }

      setProfile((prev) => prev ? { ...prev, avatar: url } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" aria-label="加载中" />
        <span className="sr-only">加载中</span>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <User className="w-16 h-16 mb-4" />
        <p className="text-sm mb-4">加载失败</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-full hover:bg-green-100"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 h-11">
          <button
            onClick={() => router.push('/profile')}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium flex-1 text-center pr-6">设置</span>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Avatar */}
      <div className="bg-white mt-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-900">头像</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2"
          >
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-200">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.nickname}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-medium">
                  {profile.nickname.charAt(0)}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <Camera className="w-4 h-4 text-gray-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarUpload}
            className="hidden"
            aria-label="上传头像"
          />
        </div>
      </div>

      {/* Form */}
      <div className="bg-white mt-3 px-4 py-4 space-y-4">
        <div>
          <label htmlFor="nickname" className="block text-sm text-gray-900 mb-1.5">
            昵称
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-900 mb-1.5">邮箱</label>
          <div className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50">
            {profile.email}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-900 mb-1.5">学号</label>
          <div className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50">
            {profile.studentId}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="px-4 mt-6">
        <button
          onClick={handleSave}
          disabled={saving || nickname.trim() === profile.nickname}
          className="w-full h-10 bg-green-500 text-white text-sm font-medium rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </>
          ) : success ? (
            '已保存'
          ) : (
            '保存修改'
          )}
        </button>
      </div>
    </div>
  )
}
