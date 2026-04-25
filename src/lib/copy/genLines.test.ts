/**
 * v3.9 召唤等待台词测试。
 * - 文案池非空且 >= 10 条
 * - pickGenLine 不连续重复
 */
import { describe, it, expect } from 'vitest'
import { GEN_LINES, pickGenLine } from './genLines'

describe('GEN_LINES', () => {
  it('至少 10 条', () => {
    expect(GEN_LINES.length).toBeGreaterThanOrEqual(10)
  })

  it('每条非空 + 末尾省略号（视觉一致）', () => {
    for (const l of GEN_LINES) {
      expect(l.trim()).toBeTruthy()
      expect(l.endsWith('…')).toBe(true)
    }
  })

  it('不重复', () => {
    expect(new Set(GEN_LINES).size).toBe(GEN_LINES.length)
  })
})

describe('pickGenLine', () => {
  it('prev=null 时返回池中任一条', () => {
    const l = pickGenLine(null)
    expect(GEN_LINES).toContain(l)
  })

  it('prev=某条 时不连续重复（多次采样验证）', () => {
    // 因为 GEN_LINES > 1，必定能换条
    const prev = GEN_LINES[0]
    for (let i = 0; i < 50; i++) {
      const l = pickGenLine(prev)
      // 等于 prev 的概率应该是 0（因 dedupe 兜底）
      expect(l).not.toBe(prev)
    }
  })
})
