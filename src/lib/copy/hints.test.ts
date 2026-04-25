/**
 * 文案库纯函数测试。
 * - lifeRefillHint：v3.8.1 改函数化（支持动态 done/max）
 *   * 不带参 → 纯教育文案"做任务可续命"
 *   * 带 done+max → "做任务可续命 · 今日 X/Y"
 */
import { describe, it, expect } from 'vitest'
import { COPY } from './hints'

describe('COPY.pet.lifeRefillHint', () => {
  it('no args → 教育文案，不带 X/Y', () => {
    expect(COPY.pet.lifeRefillHint()).toBe('做任务可续命')
  })

  it('done=0, max=5 → 显示今日 0/5', () => {
    expect(COPY.pet.lifeRefillHint(0, 5)).toBe('做任务可续命 · 今日 0/5')
  })

  it('done=2, max=5 → 显示今日 2/5', () => {
    expect(COPY.pet.lifeRefillHint(2, 5)).toBe('做任务可续命 · 今日 2/5')
  })

  it('done=max → 满进度也正常显示', () => {
    expect(COPY.pet.lifeRefillHint(5, 5)).toBe('做任务可续命 · 今日 5/5')
  })

  it('文案不含硬编码 "2 次" 或 "5 次"（治 MAX_DAILY_TASKS 改文案漏改）', () => {
    const samples = [
      COPY.pet.lifeRefillHint(),
      COPY.pet.lifeRefillHint(0, 5),
      COPY.pet.lifeRefillHint(2, 5),
    ]
    for (const s of samples) {
      expect(s).not.toMatch(/每日最多 \d+ 次/)
    }
  })
})
