'use client'
import { useEffect, useRef } from 'react'
import { useCountdown, type CountdownPhase } from '@/hooks/useCountdown'
import type { PetStatus } from '@/types/pet'

interface Props {
  expiresAt: number | null
  status: PetStatus
  /** 静态 fallback 文案（SSR / dead / released 时显示） */
  staticLabel?: string
  /** 样式变体：'hero' 大号、'card' 小号、'inline' 极简 */
  variant?: 'hero' | 'card' | 'inline'
  /** 倒计时到 0 的一瞬（仅 status==='alive' 有效），由父组件触发刷新用 */
  onExpire?: () => void
  className?: string
}

/**
 * 宠物生命倒计时组件。alive → 实时 tick + 分阶段变色；非 alive → 静态文本。
 *
 * 阈值（阶段 → 颜色）：
 * safe >30m → 白；warn 10-30m → 琥珀；danger 2-10m → 红；
 * critical <2m → 红+脉动；dead → 灰
 */
export default function Countdown({
  expiresAt,
  status,
  staticLabel,
  variant = 'card',
  onExpire,
  className = '',
}: Props) {
  const { label, phase } = useCountdown(status === 'alive' ? expiresAt : null)

  // phase 切到 dead 的瞬间触发 onExpire（只触发一次，由父组件拉 refresh）
  const prevPhaseRef = useRef<CountdownPhase | null>(null)
  useEffect(() => {
    if (prevPhaseRef.current !== 'dead' && phase === 'dead' && status === 'alive') {
      onExpire?.()
    }
    prevPhaseRef.current = phase
  }, [phase, status, onExpire])

  if (status !== 'alive') {
    return <span className={baseClass(variant, 'static') + ' ' + className}>{staticLabel ?? ''}</span>
  }

  if (!expiresAt) {
    return <span className={baseClass(variant, 'static') + ' ' + className}>寿命未知</span>
  }

  return (
    <span className={baseClass(variant, phase) + ' ' + className} suppressHydrationWarning>
      {phase === 'dead' ? '🕯️ 安息中...' : label}
    </span>
  )
}

function baseClass(variant: Props['variant'], phase: CountdownPhase | 'static'): string {
  const size =
    variant === 'hero' ? 'text-2xl font-bold tabular-nums'
    : variant === 'inline' ? 'text-[10px] tabular-nums'
    : 'text-sm tabular-nums'

  const color =
    phase === 'static' ? 'text-gray-500'
    : phase === 'dead' ? 'text-gray-500'
    : phase === 'critical' ? 'text-red-500 animate-pulse'
    : phase === 'danger' ? 'text-red-400'
    : phase === 'warn' ? 'text-amber-400'
    : 'text-white'

  return `${size} ${color}`
}
