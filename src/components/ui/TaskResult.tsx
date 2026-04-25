'use client'
import { useEffect, useState } from 'react'
import type { TaskVerdict, Reward } from '@/types/task'
import type { ElementId, FullPet } from '@/types/pet'
import { formatRemaining } from '@/lib/view/petView'
import { COPY } from '@/lib/copy/hints'

const ELEMENT_BG: Record<ElementId, string> = {
  ruins: '/bg/ruins.jpg',
  fire: '/bg/fire.jpg',
  water: '/bg/water.jpg',
  ice: '/bg/ice.jpg',
  dark: '/bg/dark.jpg',
  sky: '/bg/sky.jpg',
}

interface Props {
  verdict: TaskVerdict
  pet: FullPet
  prevExpiresAt: number | null
  newExpiresAt: number | null
  effectiveReward?: Reward
  /** reject 时走"换一个"；pass 时不显示 */
  onRetry(): void
  onClose(): void
  /** v3.9: reject 幕"换一个"按钮的剩余次数；undefined 或 0 → 隐藏 */
  remainingRerolls?: number
  /** v3.9: reroll 进行中禁用 */
  rerolling?: boolean
}

/**
 * v3.5 任务剧场 · 第四幕：结果。
 * pass：大飞字 +N 分钟 / +N EXP + 宠物 glow + 生命条从旧→新 tween
 * reject：拒绝画面 + reason + 换一个/关闭
 * 动画节奏见 14-任务剧场与单宠范式.md §附录 A
 */
export default function TaskResult({
  verdict,
  pet,
  prevExpiresAt,
  newExpiresAt,
  effectiveReward,
  onRetry,
  onClose,
  remainingRerolls,
  rerolling,
}: Props) {
  if (verdict.pass) {
    return (
      <PassLayer
        pet={pet}
        prevExpiresAt={prevExpiresAt}
        newExpiresAt={newExpiresAt}
        effectiveReward={effectiveReward}
        onClose={onClose}
      />
    )
  }
  return (
    <RejectLayer
      pet={pet}
      verdict={verdict}
      onRetry={onRetry}
      onClose={onClose}
      remainingRerolls={remainingRerolls}
      rerolling={rerolling}
    />
  )
}

function PassLayer({
  pet,
  prevExpiresAt,
  newExpiresAt,
  effectiveReward,
  onClose,
}: {
  pet: FullPet
  prevExpiresAt: number | null
  newExpiresAt: number | null
  effectiveReward?: Reward
  onClose(): void
}) {
  const bgUrl = pet.element ? ELEMENT_BG[pet.element] : '/daily-bg.jpg'
  const minutes = effectiveReward?.minutes
  const exp = effectiveReward?.exp
  // 900ms 后开始倒计时数字 tween
  const [tweenedLabel, setTweenedLabel] = useState(() => formatExpire(prevExpiresAt))

  useEffect(() => {
    if (!prevExpiresAt || !newExpiresAt || prevExpiresAt === newExpiresAt) {
      setTweenedLabel(formatExpire(newExpiresAt))
      return
    }
    const start = performance.now()
    const startDelay = 900
    const duration = 400
    let raf = 0
    const step = (t: number) => {
      const elapsed = t - start
      if (elapsed < startDelay) {
        raf = requestAnimationFrame(step)
        return
      }
      const progress = Math.min(1, (elapsed - startDelay) / duration)
      // cubic-bezier(0.3, 0, 0.2, 1) 近似
      const eased = 1 - Math.pow(1 - progress, 3)
      const cur = prevExpiresAt + (newExpiresAt - prevExpiresAt) * eased
      setTweenedLabel(formatExpire(cur))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [prevExpiresAt, newExpiresAt])

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      <div className="absolute inset-0 bg-black/55 pointer-events-none anim-fade" />

      <div className="relative h-full flex flex-col items-center justify-center px-6 gap-6">
        {/* 标题 */}
        <p
          className="text-white/90 text-sm tracking-[0.25em] uppercase anim-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          {COPY.taskStage.passTitle}
        </p>

        {/* 宠物图 glow */}
        <div
          className="w-36 h-36 rounded-2xl bg-gray-800 overflow-hidden anim-glow [text-shadow:0_0_0_transparent]"
          style={{ animationDelay: '800ms' }}
        >
          {pet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-white">🐾</div>
          )}
        </div>

        {/* 飞字 +N min */}
        {minutes ? (
          <p
            className="text-white text-4xl font-bold tabular-nums anim-fly-up [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]"
            style={{ animationDelay: '100ms' }}
          >
            +{minutes} <span className="text-xl font-normal opacity-90">分钟</span>
          </p>
        ) : null}

        {/* 飞字 +N EXP */}
        {exp ? (
          <p
            className="text-white text-2xl font-semibold tabular-nums anim-fly-up [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]"
            style={{ animationDelay: '500ms' }}
          >
            +{exp} <span className="text-base font-normal opacity-90">EXP</span>
          </p>
        ) : null}

        {/* 倒计时 tween */}
        <div
          className="mt-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm anim-fade-up"
          style={{ animationDelay: '900ms' }}
        >
          <p className="text-white text-sm tabular-nums">
            剩余 · {tweenedLabel}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 anim-fade-up"
        style={{ animationDelay: '1500ms' }}
      >
        <button
          onClick={onClose}
          className="w-full h-14 rounded-full bg-white text-gray-900 text-base font-semibold active:scale-[0.98] transition-transform"
        >
          {COPY.taskStage.passCTA}
        </button>
      </div>
    </div>
  )
}

function RejectLayer({
  pet,
  verdict,
  onRetry,
  onClose,
  remainingRerolls,
  rerolling,
}: {
  pet: FullPet
  verdict: TaskVerdict
  onRetry(): void
  onClose(): void
  remainingRerolls?: number
  rerolling?: boolean
}) {
  const bgUrl = pet.element ? ELEMENT_BG[pet.element] : '/daily-bg.jpg'
  // v3.9: 接入 v3.8 reroll API。剩余 > 0 才启用"换一个"
  const retryAvailable =
    typeof remainingRerolls === 'number' && remainingRerolls > 0
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      <div className="absolute inset-0 bg-black/75 pointer-events-none anim-fade" />

      <div className="relative h-full flex flex-col items-center justify-center px-6 gap-5">
        <p
          className="text-white text-xl font-semibold anim-scale-in text-center [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]"
          style={{ animationDelay: '200ms' }}
        >
          {COPY.taskStage.rejectTitle}
        </p>
        <p
          className="text-white/70 text-sm text-center max-w-xs leading-relaxed anim-fade-up"
          style={{ animationDelay: '600ms' }}
        >
          {verdict.reason}
        </p>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 flex flex-col gap-2 anim-fade-up"
        style={{ animationDelay: '900ms' }}
      >
        {retryAvailable && (
          <button
            onClick={onRetry}
            disabled={rerolling}
            className="w-full h-12 rounded-full bg-white/90 text-gray-900 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {rerolling
              ? COPY.taskStage.rerollLoading
              : COPY.taskStage.rerollCTA(remainingRerolls!)}
          </button>
        )}
        <button
          onClick={onClose}
          disabled={rerolling}
          className="w-full h-12 rounded-full bg-white/10 border border-white/30 text-white text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {COPY.taskStage.rejectClose}
        </button>
      </div>
    </div>
  )
}

function formatExpire(ts: number | null): string {
  if (!ts) return '—'
  const ms = Math.max(0, ts - Date.now())
  return formatRemaining(ms)
}
