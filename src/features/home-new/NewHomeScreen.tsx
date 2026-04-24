'use client'
import { useState } from 'react'
import Link from 'next/link'
import DrawFlow from '@/features/draw/DrawFlow'
import type { WorldState } from '@/lib/game/world'

interface Props {
  world: WorldState
  hasArchive: boolean
}

/**
 * 新用户/空巢用户的首屏（"神笔"召唤爆点）。
 * - 无 cookie：hasArchive = false，档案入口隐藏
 * - 老用户但无活宠：hasArchive = true，保留档案入口看历史（墓碑）
 */
export default function NewHomeScreen({ world, hasArchive }: Props) {
  const [drawing, setDrawing] = useState(false)

  if (drawing) {
    return <DrawFlow open onClose={() => setDrawing(false)} />
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-between px-6 py-16">
      {/* 世界状态 + 档案入口 */}
      <div className="w-full flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-xs tracking-widest uppercase">
            末日第 {world.dayCount} 天
          </p>
          {hasArchive && (
            <p className="text-gray-700 text-[10px] mt-1 tracking-wider">
              {world.petCount} 个生命存活
            </p>
          )}
        </div>
        {hasArchive && (
          <Link
            href="/me"
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs active:scale-95 transition-transform"
          >
            <span>📖</span>
            <span>档案</span>
          </Link>
        )}
      </div>

      {/* 主标题 */}
      <div className="text-center space-y-4">
        <h1 className="text-white text-4xl font-bold tracking-tight">神笔</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          你画的每一笔<br />都是一条生命
        </p>
      </div>

      {/* 召唤按钮 */}
      <button
        onClick={() => setDrawing(true)}
        className="w-full max-w-xs h-14 rounded-full bg-white text-gray-900 font-semibold text-lg active:scale-95 transition-transform"
      >
        开始召唤
      </button>
    </div>
  )
}
