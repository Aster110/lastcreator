'use client'
import { useEffect, useState } from 'react'
import { formatRemaining } from '@/lib/view/petView'

export type CountdownPhase = 'safe' | 'warn' | 'danger' | 'critical' | 'dead'

export interface CountdownResult {
  remainingMs: number
  label: string
  /**
   * safe: >30min；warn: 10-30min（橙）；danger: 2-10min（红）；
   * critical: <2min（红+脉动）；dead: 0
   */
  phase: CountdownPhase
}

/**
 * 每秒 tick 的倒计时。
 * - expiresAt = null → 返回 { ms: 0, label: '', phase: 'safe' }（不 tick）
 * - 到达 0 → 停止 tick，phase='dead'
 */
export function useCountdown(expiresAt: number | null): CountdownResult {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  if (!expiresAt) return { remainingMs: 0, label: '', phase: 'safe' }
  const remainingMs = Math.max(0, expiresAt - now)
  const phase: CountdownPhase =
    remainingMs <= 0 ? 'dead'
    : remainingMs < 2 * 60_000 ? 'critical'
    : remainingMs < 10 * 60_000 ? 'danger'
    : remainingMs < 30 * 60_000 ? 'warn'
    : 'safe'
  return { remainingMs, label: formatRemaining(remainingMs), phase }
}
