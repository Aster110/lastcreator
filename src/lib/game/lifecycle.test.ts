/**
 * v3.6 生命周期数值测试
 * 保证 calcInitialExpiresAt 输出在目标区间（27-30h）
 */
import { describe, it, expect } from 'vitest'
import { LIFECYCLE, calcInitialExpiresAt } from './lifecycle'

describe('LIFECYCLE constants (v3.6)', () => {
  it('BASE_LIFE_MS is 27h', () => {
    expect(LIFECYCLE.BASE_LIFE_MS).toBe(27 * 60 * 60 * 1000)
  })

  it('MAX_BONUS_MINUTES is 180 (3h bonus cap)', () => {
    expect(LIFECYCLE.MAX_BONUS_MINUTES).toBe(180)
  })
})

describe('calcInitialExpiresAt (v3.6)', () => {
  const NOW = 1_000_000_000_000 // fixed ref

  it('bonus=0 → base 27h', () => {
    const expiresAt = calcInitialExpiresAt(0, NOW)
    const hours = (expiresAt - NOW) / 3_600_000
    expect(hours).toBeCloseTo(27, 5)
  })

  it('bonus=120 → 29h', () => {
    const expiresAt = calcInitialExpiresAt(120, NOW)
    const hours = (expiresAt - NOW) / 3_600_000
    expect(hours).toBeCloseTo(29, 5)
  })

  it('bonus=180 (upper cap) → 30h', () => {
    const expiresAt = calcInitialExpiresAt(180, NOW)
    const hours = (expiresAt - NOW) / 3_600_000
    expect(hours).toBeCloseTo(30, 5)
  })

  it('bonus>180 gets clamped to 180 (30h)', () => {
    const expiresAt = calcInitialExpiresAt(9999, NOW)
    const hours = (expiresAt - NOW) / 3_600_000
    expect(hours).toBeCloseTo(30, 5)
  })

  it('negative bonus clamps to 0 (27h)', () => {
    const expiresAt = calcInitialExpiresAt(-99, NOW)
    const hours = (expiresAt - NOW) / 3_600_000
    expect(hours).toBeCloseTo(27, 5)
  })
})
