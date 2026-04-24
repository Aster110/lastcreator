'use client'
import Link from 'next/link'

interface Props {
  petId: string
  onDraw: () => void
}

/**
 * 主宠屏底部按钮组。
 * 扩展点：加按钮直接在这加 <Link> 或 <button>。
 */
export default function HomePetActions({ petId, onDraw }: Props) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onDraw}
        className="flex-1 h-12 rounded-full bg-gray-900 border border-gray-800 text-gray-300 text-sm active:scale-95 transition-transform"
      >
        + 再画一只
      </button>
      <Link
        href={`/me/${petId}`}
        className="flex-1 h-12 flex items-center justify-center rounded-full bg-white text-gray-900 text-sm font-semibold active:scale-95 transition-transform"
      >
        👤 详情
      </Link>
    </div>
  )
}
