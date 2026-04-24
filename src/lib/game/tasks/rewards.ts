import { getState, patchPetState } from '@/lib/repo/petState'
import { emit } from '@/lib/events'
import type { Reward } from '@/types/task'
import type { PetState, PetStatePatch } from '@/types/pet'

/**
 * 把 reward 应用到 pets_state：累加 hp/exp 等
 * 返回新 state（给 API 立即回前端）
 */
export async function applyReward(petId: string, reward: Reward): Promise<PetState> {
  const cur = await getState(petId)
  if (!cur) throw new Error(`applyReward: no state for ${petId}`)

  const patch: PetStatePatch = {}
  if (reward.hp !== undefined) patch.hp = cur.hp + reward.hp
  if (reward.exp !== undefined) patch.exp = cur.exp + reward.exp
  if (reward.mood !== undefined) patch.mood = reward.mood

  const next = await patchPetState(petId, patch)
  emit({ type: 'state.changed', petId, delta: patch, at: Date.now() })
  return next
}
