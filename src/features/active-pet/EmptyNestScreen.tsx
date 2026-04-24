'use client'
import Link from 'next/link'
import type { DisplayPet } from '@/types/pet'
import { COPY } from '@/lib/copy/hints'

interface WorldState {
  dayCount: number
  totalHp: number
  petCount: number
}

interface Props {
  /** 最近一只（可能是放生 / 已故）。null → 全新用户兜底 */
  lastPet: DisplayPet | null
  world: WorldState
}

/**
 * v3.5: 空巢页。
 * - 有历史：展示最近一只剪影 + 台词 + 召唤 CTA + 翻墓碑链接
 * - 无历史：纯召唤引导
 *
 * 动画节奏见 14-任务剧场与单宠范式.md §附录 A
 */
export default function EmptyNestScreen({ lastPet, world }: Props) {
  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: 'url(/daily-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/55 pointer-events-none anim-fade" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        >
          ←
        </Link>
        <h1 className="text-white text-base tracking-widest [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          末日第 {world.dayCount} 天
        </h1>
        <Link
          href="/gallery"
          className="text-white text-xs px-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        >
          图鉴
        </Link>
      </div>

      {/* 主体：居中 */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {lastPet ? (
          <>
            {/* 黑白剪影 */}
            <div
              className="w-40 h-40 rounded-2xl bg-gray-800 overflow-hidden anim-scale-in grayscale opacity-60"
              style={{ animationDelay: '300ms' }}
            >
              {lastPet.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lastPet.imageUrl} alt={lastPet.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-gray-400">🐾</div>
              )}
            </div>

            {/* 台词 */}
            <div
              className="text-center anim-fade-up"
              style={{ animationDelay: '800ms' }}
            >
              <p className="text-white text-xl font-semibold [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]">
                {COPY.emptyNest.titleWithLast(lastPet.name)}
              </p>
              <p className="text-white/70 text-sm mt-2">{COPY.emptyNest.subtitleWithLast}</p>
            </div>
          </>
        ) : (
          <div
            className="text-center anim-fade-up"
            style={{ animationDelay: '300ms' }}
          >
            <p className="text-white text-2xl font-semibold [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]">
              {COPY.emptyNest.titleFresh}
            </p>
            <p className="text-white/70 text-sm mt-3 max-w-xs mx-auto leading-relaxed">
              {COPY.emptyNest.subtitleFresh}
            </p>
          </div>
        )}
      </div>

      {/* 底部 CTA */}
      <div
        className="relative px-6 pb-10 pt-4 space-y-2 anim-fade-up"
        style={{ animationDelay: '1200ms' }}
      >
        <Link
          href="/draw"
          className="block w-full h-14 rounded-full bg-white text-gray-900 text-base font-semibold flex items-center justify-center active:scale-[0.98] transition-transform anim-breathe"
        >
          {COPY.emptyNest.summonCTA}
        </Link>
        {lastPet && (
          <Link
            href="/me/history"
            className="block w-full h-10 text-white/70 text-sm flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            {COPY.emptyNest.viewTombstone}
          </Link>
        )}
      </div>
    </div>
  )
}
