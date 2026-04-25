/**
 * v3.8 任务 prompt 纯函数层
 * - nowSlotFromDate：把时间划分为 morning/afternoon/evening/night
 * - buildPromptContext：组装 AI 调用需要的上下文
 * - pickTemplateForPet：按 pet.element 分桶 + context 加权选 template
 *   * v3.8: 加权策略——outdoor 0.4 / indoor 0.6 / any 1.0
 *   * v3.8: 夜晚（night） 或 !outdoorAllowed → outdoor 权重置 0
 *
 * 这些都是纯函数，完整单测覆盖（见 taskPrompt.test.ts）。
 * AI 调用在 `lib/ai/taskPrompt.ts`。
 */
import type { FullPet } from '@/types/pet'
import {
  ALL_TEMPLATES,
  ELEMENT_TEMPLATES,
  GENERIC_TEMPLATES,
  type TaskTemplate,
  type TaskContext,
} from './templates'

export type NowSlot = 'morning' | 'afternoon' | 'evening' | 'night'

/** 时段划分：供 AI 注入"现在什么时候"的氛围感 */
export function nowSlotFromDate(d: Date = new Date()): NowSlot {
  const h = d.getHours()
  if (h < 6) return 'night'
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  if (h < 22) return 'evening'
  return 'night'
}

export interface PromptContext {
  template: TaskTemplate
  pet: {
    name: string
    personality: string
    element: FullPet['element']
    stage: string
  }
  world: { dayCount: number }
  nowSlot: NowSlot
}

export function buildPromptContext(
  template: TaskTemplate,
  pet: FullPet,
  world: { dayCount: number },
  now: Date = new Date(),
): PromptContext {
  return {
    template,
    pet: {
      name: pet.name,
      personality: pet.personality,
      element: pet.element ?? null,
      stage: pet.stage,
    },
    world,
    nowSlot: nowSlotFromDate(now),
  }
}

// =============================================================================
// v3.8 pickTemplateForPet：element 分桶 + context 加权
// =============================================================================

export interface PickOptions {
  nowSlot?: NowSlot          // 'night' → 关闭 outdoor
  outdoorAllowed?: boolean   // false → 关闭 outdoor（默认 true）
}

const W_OUTDOOR = 0.4
const W_INDOOR = 0.6
const W_ANY = 1.0

function contextWeight(c: TaskContext, allowOutdoor: boolean): number {
  if (c === 'outdoor') return allowOutdoor ? W_OUTDOOR : 0
  if (c === 'indoor') return W_INDOOR
  return W_ANY
}

/**
 * 加权随机抽样（权重 0 的项必不被选）。
 * pool 必须非空，且 totalWeight > 0。
 */
function pickWeighted<T>(pool: T[], weight: (t: T) => number, rand: () => number): T {
  const total = pool.reduce((s, t) => s + weight(t), 0)
  let r = rand() * total
  for (const t of pool) {
    r -= weight(t)
    if (r <= 0) return t
  }
  return pool[pool.length - 1]
}

/**
 * 按 pet.element 分桶选 template。
 * 策略：
 * - pet.element 非空 → 70% 从 element 专属池选；30% 从通用池选
 * - pet.element 为 null → 100% 从通用池选
 * - 任一目标池空 → fallback 到 ALL_TEMPLATES
 *
 * v3.8: 选定 pool 后按 context 加权（outdoor 0.4 / indoor 0.6 / any 1.0）。
 * 夜晚或 !outdoorAllowed → outdoor 权重 = 0。
 *
 * rand 参数允许测试注入确定性随机源（默认 Math.random）
 */
export function pickTemplateForPet(
  pet: Pick<FullPet, 'element'>,
  rand: () => number = Math.random,
  opts: PickOptions = {},
): TaskTemplate {
  const allowOutdoor = opts.outdoorAllowed !== false && opts.nowSlot !== 'night'

  // 1. element 分桶
  let pool: TaskTemplate[]
  if (!pet.element) {
    pool = GENERIC_TEMPLATES.length > 0 ? GENERIC_TEMPLATES : ALL_TEMPLATES
  } else {
    const useElementPool = rand() < 0.7
    if (useElementPool) {
      pool = ELEMENT_TEMPLATES.filter(t => t.element === pet.element)
      if (pool.length === 0) pool = GENERIC_TEMPLATES
    } else {
      pool = GENERIC_TEMPLATES.length > 0 ? GENERIC_TEMPLATES : ELEMENT_TEMPLATES
    }
  }
  if (pool.length === 0) pool = ALL_TEMPLATES

  // 2. context 加权抽样
  const w = (t: TaskTemplate) => contextWeight(t.context, allowOutdoor)
  const totalW = pool.reduce((s, t) => s + w(t), 0)

  // 兜底：pool 全是 outdoor 但 outdoor 被禁 → 从 ALL_TEMPLATES 取非 outdoor
  if (totalW <= 0) {
    const fallback = ALL_TEMPLATES.filter(t => t.context !== 'outdoor')
    const safePool = fallback.length > 0 ? fallback : ALL_TEMPLATES
    return safePool[Math.floor(rand() * safePool.length)]
  }

  return pickWeighted(pool, w, rand)
}
