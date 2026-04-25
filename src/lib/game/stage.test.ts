/**
 * v3.9.4 stage 纯函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  STAGE_EXP_THRESHOLDS,
  currentStage,
  nextStageThreshold,
  shouldUpgrade,
  stageGte,
} from './stage'

describe('currentStage', () => {
  it('exp=0 → 幼年', () => expect(currentStage(0)).toBe('幼年'))
  it('exp=99 → 幼年（边界 -1）', () => expect(currentStage(99)).toBe('幼年'))
  it('exp=100 → 青年（边界正中）', () => expect(currentStage(100)).toBe('青年'))
  it('exp=299 → 青年', () => expect(currentStage(299)).toBe('青年'))
  it('exp=300 → 成年', () => expect(currentStage(300)).toBe('成年'))
  it('exp=799 → 成年', () => expect(currentStage(799)).toBe('成年'))
  it('exp=800 → 老年', () => expect(currentStage(800)).toBe('老年'))
  it('exp=10000 → 老年（封顶）', () => expect(currentStage(10000)).toBe('老年'))
  it('exp=-5 → 幼年（兜底）', () => expect(currentStage(-5)).toBe('幼年'))
})

describe('nextStageThreshold', () => {
  it('幼年 → 青年 100', () => {
    expect(nextStageThreshold('幼年')).toEqual({ stage: '青年', threshold: 100 })
  })
  it('青年 → 成年 300', () => {
    expect(nextStageThreshold('青年')).toEqual({ stage: '成年', threshold: 300 })
  })
  it('成年 → 老年 800', () => {
    expect(nextStageThreshold('成年')).toEqual({ stage: '老年', threshold: 800 })
  })
  it('老年 → null（顶级）', () => {
    expect(nextStageThreshold('老年')).toBeNull()
  })
})

describe('shouldUpgrade', () => {
  it('99 → 100 跨界 → 升级 幼年→青年', () => {
    expect(shouldUpgrade(99, 100)).toEqual({ upgraded: true, from: '幼年', to: '青年' })
  })
  it('50 → 80 同阶 → 不升级', () => {
    expect(shouldUpgrade(50, 80)).toEqual({ upgraded: false })
  })
  it('99 → 350 跨两阶 → 升级到 成年', () => {
    expect(shouldUpgrade(99, 350)).toEqual({ upgraded: true, from: '幼年', to: '成年' })
  })
  it('799 → 800 → 升级 成年→老年', () => {
    expect(shouldUpgrade(799, 800)).toEqual({ upgraded: true, from: '成年', to: '老年' })
  })
  it('800 → 1500 已老年 → 不升级', () => {
    expect(shouldUpgrade(800, 1500)).toEqual({ upgraded: false })
  })
})

describe('stageGte', () => {
  it('成年 >= 青年 = true', () => expect(stageGte('成年', '青年')).toBe(true))
  it('幼年 >= 青年 = false', () => expect(stageGte('幼年', '青年')).toBe(false))
  it('青年 >= 青年 = true（等号）', () => expect(stageGte('青年', '青年')).toBe(true))
})

describe('STAGE_EXP_THRESHOLDS shape', () => {
  it('4 个阶段都有阈值且 4 阶段单调递增', () => {
    expect(STAGE_EXP_THRESHOLDS.幼年).toBe(0)
    expect(STAGE_EXP_THRESHOLDS.青年).toBeGreaterThan(STAGE_EXP_THRESHOLDS.幼年)
    expect(STAGE_EXP_THRESHOLDS.成年).toBeGreaterThan(STAGE_EXP_THRESHOLDS.青年)
    expect(STAGE_EXP_THRESHOLDS.老年).toBeGreaterThan(STAGE_EXP_THRESHOLDS.成年)
  })
})
