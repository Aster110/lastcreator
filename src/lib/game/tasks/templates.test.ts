/**
 * v3.7 模板扩展测试
 * - 每 element 至少 3 条专属模板（6 元素 × 3 = 18 条起步）
 * - 保留通用池（element = null）作为 fallback
 * - 每条模板必备字段：id, kind, promptSkeleton, slots, defaultPrompt, verifyHint, reward, expiresInMs
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

describe('v3.7 templates structure', () => {
  it('ALL_TEMPLATES = ELEMENT_TEMPLATES + GENERIC_TEMPLATES', () => {
    expect(ALL_TEMPLATES.length).toBe(ELEMENT_TEMPLATES.length + GENERIC_TEMPLATES.length)
  })

  it('every element has at least 3 templates', () => {
    for (const el of ELEMENTS) {
      const count = ELEMENT_TEMPLATES.filter(t => t.element === el).length
      expect(count, `element ${el}`).toBeGreaterThanOrEqual(3)
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
