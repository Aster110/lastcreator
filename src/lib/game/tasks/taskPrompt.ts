/**
 * v3.7 任务 prompt 纯函数层
 * - nowSlotFromDate：把时间划分为 morning/afternoon/evening/night
 * - buildPromptContext：组装 AI 调用需要的上下文
 * - pickTemplateForPet：按 pet.element 分桶选 template
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

/**
 * 按 pet.element 分桶选 template。
 * 策略：
 * - pet.element 非空 → 70% 从 element 专属池选；30% 从通用池选
 * - pet.element 为 null → 100% 从通用池选
 * - 任一目标池空 → fallback 到 ALL_TEMPLATES
 *
 * rand 参数允许测试注入确定性随机源（默认 Math.random）
 */
export function pickTemplateForPet(
  pet: Pick<FullPet, 'element'>,
  rand: () => number = Math.random,
): TaskTemplate {
  if (!pet.element) {
    const pool = GENERIC_TEMPLATES.length > 0 ? GENERIC_TEMPLATES : ALL_TEMPLATES
    return pool[Math.floor(rand() * pool.length)]
  }

  const useElementPool = rand() < 0.7
  let pool: TaskTemplate[]
  if (useElementPool) {
    pool = ELEMENT_TEMPLATES.filter(t => t.element === pet.element)
    if (pool.length === 0) pool = GENERIC_TEMPLATES // element 桶空 → fallback 通用
  } else {
    pool = GENERIC_TEMPLATES.length > 0 ? GENERIC_TEMPLATES : ELEMENT_TEMPLATES
  }

  if (pool.length === 0) pool = ALL_TEMPLATES
  return pool[Math.floor(rand() * pool.length)]
}
