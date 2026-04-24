import { emit } from '@/lib/events'
import type { PetStatus } from '@/types/pet'

/**
 * 宠物生命周期规则（纯函数 + 一个 emit 副作用）
 *
 * 设计原则（11-v3.2 §2, §4 决策 1-2）：
 * - lifecycle 只定规则，不做 IO
 * - 实际数据库写入由 `@/lib/repo/petState` 的 patchPetState 负责
 * - 这样避免 petState ↔ lifecycle 的循环依赖
 */

export const LIFECYCLE = {
  /** 新宠物初始基础寿命：1h */
  BASE_LIFE_MS: 60 * 60 * 1000,
  /** AI 可贡献的最大随机加成：120min */
  MAX_BONUS_MINUTES: 120,
  /** 任务 reward.minutes 缺省（模板没写用这个） */
  TASK_DEFAULT_MINUTES: 120,
} as const

/** 新生宠物的初始 life_expires_at */
export function calcInitialExpiresAt(bonusMinutes: number, now: number = Date.now()): number {
  const bonus = Math.max(0, Math.min(LIFECYCLE.MAX_BONUS_MINUTES, Math.floor(bonusMinutes || 0)))
  return now + LIFECYCLE.BASE_LIFE_MS + bonus * 60_000
}

/**
 * 判定是否应该"标记死亡"（纯函数，不做 IO）
 * true = 应该切 dead；false = 保持当前状态
 */
export function shouldMarkDead(p: { status: PetStatus; lifeExpiresAt: number | null }, now: number = Date.now()): boolean {
  if (p.status !== 'alive') return false
  if (!p.lifeExpiresAt) return false
  return now >= p.lifeExpiresAt
}

/**
 * 任务完成后的续命：算出新的 life_expires_at
 * - add = minutes × completion × 60_000（向下取整）
 * - base = 当前 expires（若未到期） 或 now（若已过期 / 从未设置）
 */
export function computeExtendedExpiresAt(
  currentExpires: number | null,
  minutes: number,
  completion: number,
  now: number = Date.now(),
): number {
  const addMs = Math.max(0, Math.floor((minutes || 0) * Math.max(0, Math.min(1, completion)) * 60_000))
  const base = currentExpires && currentExpires > now ? currentExpires : now
  return base + addMs
}

/** 标记死亡后发事件（由 repo 在 patch 成功后调用） */
export function emitPetDied(petId: string): void {
  emit({ type: 'pet.died', petId, causedBy: 'expired', at: Date.now() })
}
