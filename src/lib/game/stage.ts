/**
 * v3.9.4 (Phase E): 阶段升级纯函数
 *
 * 设计：
 * - 阈值由 STAGE_EXP_THRESHOLDS 配置（外提，可调）
 * - currentStage(exp) 把 exp 映射到 stage（边界含等号 lower）
 * - shouldUpgrade(prevExp, newExp) 检查跨阈值
 * - 不做 IO；调用方在 applyReward / patchPetState 路径里使用
 */
import type { PetStage } from '@/types/pet'

export const STAGE_EXP_THRESHOLDS: Record<PetStage, number> = {
  幼年: 0,
  青年: 100,
  成年: 300,
  老年: 800,
} as const

const STAGE_ORDER: readonly PetStage[] = ['幼年', '青年', '成年', '老年'] as const

/** exp → 当前阶段（边界含等号 lower），exp < 0 也归 '幼年' */
export function currentStage(exp: number): PetStage {
  let stage: PetStage = '幼年'
  for (const s of STAGE_ORDER) {
    if (exp >= STAGE_EXP_THRESHOLDS[s]) stage = s
    else break
  }
  return stage
}

/** 下一个阶段需要的 exp 阈值；已是最高阶段返 null */
export function nextStageThreshold(
  stage: PetStage,
): { stage: PetStage; threshold: number } | null {
  const idx = STAGE_ORDER.indexOf(stage)
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null
  const next = STAGE_ORDER[idx + 1]
  return { stage: next, threshold: STAGE_EXP_THRESHOLDS[next] }
}

/**
 * 完成任务后是否跨阶段。
 * - upgraded=false：同阶段（不需要 patch.stage）
 * - upgraded=true：from → to（patch.stage = to + emit pet.leveled）
 */
export function shouldUpgrade(prevExp: number, newExp: number): {
  upgraded: boolean
  from?: PetStage
  to?: PetStage
} {
  const fromStage = currentStage(prevExp)
  const toStage = currentStage(newExp)
  if (fromStage === toStage) return { upgraded: false }
  return { upgraded: true, from: fromStage, to: toStage }
}

/**
 * v3.9.4: 比较两个 stage 的"先后"。a >= b 表示 a 不早于 b（同等或更老）。
 * 用于阶段任务池过滤（template.minStage <= pet.stage 才出）。
 */
export function stageGte(a: PetStage, b: PetStage): boolean {
  return STAGE_ORDER.indexOf(a) >= STAGE_ORDER.indexOf(b)
}
