'use client'
import { useCountdown } from '@/hooks/useCountdown'
import type { PetStatus } from '@/types/pet'

interface Props {
  expiresAt: number | null
  status: PetStatus
  /** 静态 fallback 文案（SSR / dead / released 时显示） */
  staticLabel?: string
  /** 样式变体：'hero' 大号、'card' 小号、'inline' 极简 */
  variant?: 'hero' | 'card' | 'inline'
  className?: string
}

/**
 * 宠物生命倒计时组件。alive → 实时 tick；非 alive → 静态文本。
 */
export default function Countdown({ expiresAt, status, staticLabel, variant = 'card', className = '' }: Props) {
  const { remainingMs, label } = useCountdown(status === 'alive' ? expiresAt : null)

  if (status !== 'alive') {
    return <span className={baseClass(variant, 'static') + ' ' + className}>{staticLabel ?? ''}</span>
  }

  if (!expiresAt) {
    return <span className={baseClass(variant, 'static') + ' ' + className}>寿命未知</span>
  }

  const dying = remainingMs > 0 && remainingMs < 10 * 60_000   // < 10 min
  const dead = remainingMs <= 0

  const tone = dead ? 'dead' : dying ? 'warn' : 'ok'
  return (
    <span className={baseClass(variant, tone) + ' ' + className} suppressHydrationWarning>
      {dead ? '🕯️ 安息中...' : label}
    </span>
  )
}

function baseClass(variant: Props['variant'], tone: 'ok' | 'warn' | 'dead' | 'static'): string {
  const size =
    variant === 'hero' ? 'text-2xl font-bold tabular-nums'
    : variant === 'inline' ? 'text-[10px] tabular-nums'
    : 'text-sm tabular-nums'
  const color =
    tone === 'dead' ? 'text-gray-500'
    : tone === 'warn' ? 'text-red-400'
    : tone === 'static' ? 'text-gray-500'
    : 'text-white'
  return `${size} ${color}`
}
