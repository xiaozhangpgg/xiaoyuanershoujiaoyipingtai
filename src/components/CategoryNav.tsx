'use client'

interface CategoryNavProps {
  categories: { id: number; name: string }[]
  activeId: number | null
  onChange: (id: number | null) => void
}

export default function CategoryNav({ categories, activeId, onChange }: CategoryNavProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
      role="group"
      aria-label="商品分类"
    >
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${
          activeId === null
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${
            activeId === cat.id
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
