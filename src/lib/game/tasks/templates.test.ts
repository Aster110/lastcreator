/**
 * v3.8 模板扩展测试
 * - v3.7：每 element 至少 3 条；v3.8 升到 4 条（每元素 2 photo + 2 doodle）
 * - v3.8：加 context 字段（outdoor/indoor/any）
 * - 所有 doodle = indoor（涂鸦天然不出门）
 * - outdoor 总数 ≤ 6（避免户外占比过高）
 * - indoor 总数 ≥ 15（保证室内用户够用）
 */
import { describe, it, expect } from 'vitest'
import {
  ALL_TEMPLATES,
  ELEMENT_TEMPLATES,
  GENERIC_TEMPLATES,
  type TaskTemplate,
} from './templates'
import type { ElementId } from '@/types/pet'

const ELEMENTS: ElementId[] = ['ruins', 'fire', 'water', 'ice', 'dark', 'sky']
const VALID_CONTEXTS = ['outdoor', 'indoor', 'any'] as const

describe('v3.8 templates structure', () => {
  it('ALL_TEMPLATES = ELEMENT_TEMPLATES + GENERIC_TEMPLATES', () => {
    expect(ALL_TEMPLATES.length).toBe(ELEMENT_TEMPLATES.length + GENERIC_TEMPLATES.length)
  })

  it('v3.8: every element has at least 4 templates (2 photo + 2 doodle)', () => {
    for (const el of ELEMENTS) {
      const count = ELEMENT_TEMPLATES.filter(t => t.element === el).length
      expect(count, `element ${el}`).toBeGreaterThanOrEqual(4)
    }
  })

  it('GENERIC_TEMPLATES exists (fallback pool)', () => {
    expect(GENERIC_TEMPLATES.length).toBeGreaterThan(0)
    for (const t of GENERIC_TEMPLATES) {
      expect(t.element).toBeNull()
    }
  })

  it('every template has required fields', () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.id, `template ${t.id}`).toBeTruthy()
      expect(['photo', 'doodle']).toContain(t.kind)
      expect(t.promptSkeleton).toBeTruthy()
      expect(Array.isArray(t.slots)).toBe(true)
      expect(t.defaultPrompt).toBeTruthy()
      expect(t.verifyHint).toBeTruthy()
      expect(t.reward.minutes).toBeGreaterThan(0)
      expect(t.expiresInMs).toBeGreaterThan(0)
    }
  })

  it('template ids are unique', () => {
    const ids = ALL_TEMPLATES.map(t => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('slots strings appear in promptSkeleton', () => {
    for (const t of ALL_TEMPLATES) {
      for (const slot of t.slots) {
        expect(t.promptSkeleton, `template ${t.id} should contain slot {${slot}}`).toContain(
          `{${slot}}`,
        )
      }
    }
  })

  it('v3.6 balance preserved: all template minutes >= 300', () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.reward.minutes ?? 0, `template ${t.id}`).toBeGreaterThanOrEqual(300)
    }
  })
})

describe('v3.8 context field', () => {
  it('every template has context ∈ {outdoor, indoor, any}', () => {
    for (const t of ALL_TEMPLATES) {
      expect(VALID_CONTEXTS, `template ${t.id} context=${t.context}`).toContain(t.context)
    }
  })

  it('every doodle has context = indoor (涂鸦天然不出门)', () => {
    const doodles = ALL_TEMPLATES.filter(t => t.kind === 'doodle')
    expect(doodles.length).toBeGreaterThan(0)
    for (const t of doodles) {
      expect(t.context, `doodle ${t.id}`).toBe('indoor')
    }
  })

  it('outdoor total <= 6 (避免户外占比过高)', () => {
    const outdoor = ALL_TEMPLATES.filter(t => t.context === 'outdoor')
    expect(outdoor.length).toBeLessThanOrEqual(6)
  })

  it('indoor total >= 15 (保证室内用户够用)', () => {
    const indoor = ALL_TEMPLATES.filter(t => t.context === 'indoor')
    expect(indoor.length).toBeGreaterThanOrEqual(15)
  })

  it('every element has at least 1 indoor template', () => {
    for (const el of ELEMENTS) {
      const indoor = ELEMENT_TEMPLATES.filter(t => t.element === el && t.context === 'indoor')
      expect(indoor.length, `element ${el} indoor`).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('Legacy compatibility (v3.6 tests should still work)', () => {
  it('PHOTO_TEMPLATES and DOODLE_TEMPLATES remain exported (for balance.test.ts)', async () => {
    // balance.test.ts 依赖这两个数组，v3.7 不能破坏
    const mod = await import('./templates')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mod as any).PHOTO_TEMPLATES).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mod as any).DOODLE_TEMPLATES).toBeDefined()
  })
})

// 给下面的纯函数测试 / assigner 测试用
export const TEMPLATES_EXPORT: TaskTemplate[] = ALL_TEMPLATES
