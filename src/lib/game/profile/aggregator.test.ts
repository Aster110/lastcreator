/**
 * v4.1 aggregator 纯函数测试。
 * getUserPreference（async）依赖 D1 不在此测，靠 e2e。
 */
import { describe, it, expect } from 'vitest'
import { aggregateMemoryTags } from './aggregator'
import type { MemoryTag } from '@/types/memoryTag'

function tag(t: string, w: number, ts: number, ownerId = 'u_1'): MemoryTag {
  return { memoryId: `m_${ts}`, ownerId, tag: t, weight: w, createdAt: ts }
}

describe('aggregateMemoryTags', () => {
  it('空数组 → 空 profile', () => {
    const p = aggregateMemoryTags('u_1', [])
    expect(p.ownerId).toBe('u_1')
    expect(p.topTags).toEqual([])
    expect(p.totalMemories).toBe(0)
    expect(p.lastUpdated).toBe(0)
  })

  it('count 排序：高频 tag 排前', () => {
    const rows = [
      tag('猫', 1.0, 100),
      tag('猫', 1.0, 200),
      tag('猫', 1.0, 300),
      tag('咖啡', 1.0, 150),
      tag('咖啡', 1.0, 250),
      tag('落日', 1.0, 175),
    ]
    const p = aggregateMemoryTags('u_1', rows)
    expect(p.topTags[0].tag).toBe('猫')
    expect(p.topTags[0].count).toBe(3)
    expect(p.topTags[1].tag).toBe('咖啡')
    expect(p.topTags[1].count).toBe(2)
    expect(p.topTags[2].tag).toBe('落日')
  })

  it('count 相同时按平均 weight 排序', () => {
    const rows = [
      tag('A', 0.5, 100),
      tag('A', 0.5, 200),
      tag('B', 1.0, 100),
      tag('B', 1.0, 200),
    ]
    const p = aggregateMemoryTags('u_1', rows)
    expect(p.topTags[0].tag).toBe('B') // 平均 weight 1.0 > 0.5
    expect(p.topTags[1].tag).toBe('A')
  })

  it('topN 截断', () => {
    const rows = Array.from({ length: 15 }, (_, i) => tag(`t${i}`, 1.0, 100 + i))
    const p = aggregateMemoryTags('u_1', rows, 5)
    expect(p.topTags).toHaveLength(5)
  })

  it('lastUpdated = max(createdAt)', () => {
    const rows = [
      tag('A', 1.0, 1000),
      tag('B', 1.0, 5000),
      tag('C', 1.0, 3000),
    ]
    const p = aggregateMemoryTags('u_1', rows)
    expect(p.lastUpdated).toBe(5000)
  })

  it('totalMemories = rows.length（不去重）', () => {
    const rows = [
      tag('猫', 1.0, 100),
      tag('猫', 1.0, 200),
      tag('猫', 1.0, 300),
    ]
    const p = aggregateMemoryTags('u_1', rows)
    expect(p.totalMemories).toBe(3)
    expect(p.topTags).toHaveLength(1)
  })

  it('weight 平均：confidence 0.6 + 0.8 → avg 0.7', () => {
    const rows = [
      tag('猫', 0.6, 100),
      tag('猫', 0.8, 200),
    ]
    const p = aggregateMemoryTags('u_1', rows)
    expect(p.topTags[0].weight).toBeCloseTo(0.7)
  })
})
