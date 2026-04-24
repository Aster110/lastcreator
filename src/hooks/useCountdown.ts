'use client'
import { useEffect, useState } from 'react'
import { formatRemaining } from '@/lib/view/petView'

/**
 * 每秒 tick 的倒计时。
 * - expiresAt = null → 返回 { ms: 0, label: '' }（不 tick）
 * - 到达 0 → 停止 tick，label 显示 <1 min
 */
export function useCountdown(expiresAt: number | null): { remainingMs: number; label: string } {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    // 对齐第一秒
    setNow(Date.now())
    const t = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  if (!expiresAt) return { remainingMs: 0, label: '' }
  const remainingMs = Math.max(0, expiresAt - now)
  return { remainingMs, label: formatRemaining(remainingMs) }
}
