import { getState, patchPetState } from '@/lib/repo/petState'
import { emit } from '@/lib/events'
import { computeExtendedExpiresAt } from '@/lib/game/lifecycle'
import { shouldUpgrade } from '@/lib/game/stage'
import type { Reward } from '@/types/task'
import type { PetState, PetStatePatch } from '@/types/pet'

/**
 * 把完成度应用到 reward，输出"实际生效" reward
 * - minutes / exp：乘 completion
 * - mood / unlockSkill：completion >= 0.8 才应用（非量化）
 * - hp：保留（deprecated，不乘）
 */
export function discountReward(reward: Reward, completion: number): Reward {
  const c = Math.max(0, Math.min(1, completion))
  const out: Reward = {}
  if (reward.minutes !== undefined) out.minutes = Math.round(reward.minutes * c)
  if (reward.exp !== undefined) out.exp = Math.round(reward.exp * c)
  if (reward.hp !== undefined) out.hp = reward.hp
  if (reward.mood !== undefined && c >= 0.8) out.mood = reward.mood
  if (reward.unlockSkill !== undefined && c >= 0.8) out.unlockSkill = reward.unlockSkill
  return out
}

export interface ApplyRewardResult {
  state: PetState
  lifeExtendedMs: number
}

/**
 * 把 effective reward 应用到 pets_state
 * - minutes → 用 lifecycle.computeExtendedExpiresAt 算新 lifeExpiresAt
 * - exp → 累加
 * - mood → 直接 set
 * 返回 { state, lifeExtendedMs } 给上层发事件
 */
export async function applyReward(petId: string, effectiveReward: Reward): Promise<ApplyRewardResult> {
  const cur = await getState(petId)
  if (!cur) throw new Error(`applyReward: no state for ${petId}`)

  const patch: PetStatePatch = {}
  let newExp = cur.exp
  if (effectiveReward.exp !== undefined) {
    newExp = cur.exp + effectiveReward.exp
    patch.exp = newExp
  }
  if (effectiveReward.mood !== undefined) patch.mood = effectiveReward.mood

  // v3.9.4: stage 升级判定（exp 跨阈值时同步写 stage 字段）
  const upgrade = shouldUpgrade(cur.exp, newExp)
  if (upgrade.upgraded && upgrade.to) {
    patch.stage = upgrade.to
  }

  // 续命：只对 alive 有效；死/放生的宠物不续
  let lifeExtendedMs = 0
  if (cur.status === 'alive' && effectiveReward.minutes && effectiveReward.minutes > 0) {
    const nextExpires = computeExtendedExpiresAt(cur.lifeExpiresAt, effectiveReward.minutes, 1)
    const before = cur.lifeExpiresAt ?? Date.now()
    lifeExtendedMs = Math.max(0, nextExpires - before)
    patch.lifeExpiresAt = nextExpires
  }

  const next = await patchPetState(petId, patch)
  emit({ type: 'state.changed', petId, delta: patch, at: Date.now() })
  // v3.9.4: 升级事件——UI 监听用作动画/通知（v4 接 stage 任务池切换）
  if (upgrade.upgraded && upgrade.from && upgrade.to) {
    emit({ type: 'pet.leveled', petId, from: upgrade.from, to: upgrade.to, at: Date.now() })
  }
  return { state: next, lifeExtendedMs }
}
