/**
 * v3.6 游戏平衡校核测试
 *
 * 北极星：一天做满 5 个任务（daily_max），以平均 completion=0.7 估算，
 *        续命总和应 > 24h，这样"做满一天 → 能活过当天 + 续到明天"。
 *
 * 这是数值设计的硬边界——改任何 template 的 minutes，这个测试会告诉你
 * 是否打破了平衡。
 */
import { describe, it, expect } from 'vitest'
import { PHOTO_TEMPLATES, DOODLE_TEMPLATES } from './tasks/templates'
import { MAX_DAILY_TASKS } from './rules'

describe('Game balance (v3.6 · 5 tasks/day should net >24h life)', () => {
  const AVG_COMPLETION = 0.7 // 实际平均 completion 保守估计
  const TARGET_HOURS = 24

  it('MAX_DAILY_TASKS is 5', () => {
    expect(MAX_DAILY_TASKS).toBe(5)
  })

  it('template pool has photo + doodle models', () => {
    expect(PHOTO_TEMPLATES.length).toBeGreaterThan(0)
    expect(DOODLE_TEMPLATES.length).toBeGreaterThan(0)
  })

  it('avg template minutes × daily_max × avg_completion ≥ 24h', () => {
    const all = [...PHOTO_TEMPLATES, ...DOODLE_TEMPLATES]
    const avgMinutes = all.reduce((s, t) => s + (t.reward.minutes ?? 0), 0) / all.length

    const netMinutes = avgMinutes * MAX_DAILY_TASKS * AVG_COMPLETION
    const netHours = netMinutes / 60

    // 打印供调试
    // eslint-disable-next-line no-console
    console.log(
      `[balance] avg=${avgMinutes.toFixed(0)}min  daily=${MAX_DAILY_TASKS}  ` +
        `completion=${AVG_COMPLETION}  →  net=${netHours.toFixed(1)}h`,
    )

    expect(netHours).toBeGreaterThanOrEqual(TARGET_HOURS)
  })

  it('every template has minutes >= 300 (v3.6 lower bound)', () => {
    const all = [...PHOTO_TEMPLATES, ...DOODLE_TEMPLATES]
    for (const t of all) {
      expect(t.reward.minutes ?? 0).toBeGreaterThanOrEqual(300)
    }
  })

  it('every template has minutes <= 600 (sanity upper)', () => {
    const all = [...PHOTO_TEMPLATES, ...DOODLE_TEMPLATES]
    for (const t of all) {
      expect(t.reward.minutes ?? 0).toBeLessThanOrEqual(600)
    }
  })
})
