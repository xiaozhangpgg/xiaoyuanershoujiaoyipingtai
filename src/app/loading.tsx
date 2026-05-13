import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen" role="status">
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      <span className="sr-only">加载中</span>
    </div>
  )
}
