import BottomNav from '@/components/BottomNav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-16">{children}</div>
      <BottomNav />
    </div>
  )
}
