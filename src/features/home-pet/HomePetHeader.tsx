'use client'
import Link from 'next/link'
import type { WorldState } from '@/lib/game/world'

interface Props {
  world: WorldState
}

export default function HomePetHeader({ world }: Props) {
  return (
    <div className="w-full flex items-start justify-between">
      <div>
        <p className="text-gray-600 text-xs tracking-widest uppercase">
          末日第 {world.dayCount} 天
        </p>
        <p className="text-gray-700 text-[10px] mt-1 tracking-wider">
          {world.petCount} 个生命存活
        </p>
      </div>
      <Link
        href="/me"
        className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs active:scale-95 transition-transform"
      >
        <span>📖</span>
        <span>档案</span>
      </Link>
    </div>
  )
}
