'use client'

import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 px-4">
      <AlertCircle className="w-16 h-16 mb-4" />
      <h2 className="text-lg font-medium text-gray-900 mb-2">出错了</h2>
      <p className="text-sm mb-4 text-center">{error.message || '加载失败，请重试'}</p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 transition-colors"
      >
        重试
      </button>
    </div>
  )
}
