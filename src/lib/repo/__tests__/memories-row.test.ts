/**
 * v4.1 Phase B · memories payload 拆列纯函数测试
 *
 * 验证：
 *   - splitPayloadIntoColumns：4 种 kind 各自的列填充
 *   - rowToPayload：4 种 kind 从拆列重组 + JSON fallback
 *   - 边界：preference tags fallback、event meta、null 处理
 */
import { describe, it, expect } from 'vitest'
import { rowToPayload, splitPayloadIntoColumns } from '../memories'
import type { MemoryPayload } from '@/types/memory'

const EMPTY_COLS = {
  preference_task_id: null,
  inheritance_from_pet_id: null,
  inheritance_fragment_text: null,
  event_name: null,
  event_meta: null,
  narrative_title: null,
  narrative_body: null,
  narrative_model_id: null,
  narrative_cause: null,
}

describe('splitPayloadIntoColumns', () => {
  it('preference: 拆出 task_id', () => {
    const result = splitPayloadIntoColumns({
      kind: 'preference',
      tags: ['猫', '咖啡'],
      confidence: 0.9,
      taskId: 't_xyz',
    })
    expect(result.preference_task_id).toBe('t_xyz')
    expect(result.inheritance_from_pet_id).toBeNull()
    expect(result.narrative_title).toBeNull()
  })

  it('preference: taskId 缺失 → null', () => {
    const result = splitPayloadIntoColumns({
      kind: 'preference',
      tags: ['日落'],
      confidence: 1.0,
    })
    expect(result.preference_task_id).toBeNull()
  })

  it('inheritance: 拆出两字段', () => {
    const result = splitPayloadIntoColumns({
      kind: 'inheritance',
      fromPetId: 'p_old',
      fragmentText: '它有忧郁的眼神',
    })
    expect(result.inheritance_from_pet_id).toBe('p_old')
    expect(result.inheritance_fragment_text).toBe('它有忧郁的眼神')
  })

  it('event: meta 为 undefined → event_meta null', () => {
    const result = splitPayloadIntoColumns({
      kind: 'event',
      event: 'born',
    })
    expect(result.event_name).toBe('born')
    expect(result.event_meta).toBeNull()
  })

  it('event: meta 存在 → JSON 序列化', () => {
    const result = splitPayloadIntoColumns({
      kind: 'event',
      event: 'task_passed',
      meta: { taskId: 't_1', completion: 0.8 },
    })
    expect(result.event_meta).toBe('{"taskId":"t_1","completion":0.8}')
  })

  it('narrative: 4 字段全填', () => {
    const result = splitPayloadIntoColumns({
      kind: 'narrative',
      title: '它的一生',
      body: '...',
      modelId: 'opus-4.6',
      cause: 'died',
    })
    expect(result.narrative_title).toBe('它的一生')
    expect(result.narrative_cause).toBe('died')
    expect(result.narrative_model_id).toBe('opus-4.6')
  })
})

describe('rowToPayload', () => {
  it('inheritance: 优先用新列', () => {
    const result = rowToPayload({
      kind: 'inheritance',
      payload: '{"kind":"inheritance","fromPetId":"WRONG","fragmentText":"WRONG"}',
      ...EMPTY_COLS,
      inheritance_from_pet_id: 'p_correct',
      inheritance_fragment_text: '继承文本',
    })
    expect(result).toEqual({
      kind: 'inheritance',
      fromPetId: 'p_correct',
      fragmentText: '继承文本',
    })
  })

  it('inheritance: 新列 null 但有老 JSON → fallback', () => {
    const result = rowToPayload({
      kind: 'inheritance',
      payload: '{"kind":"inheritance","fromPetId":"p_x","fragmentText":"y"}',
      ...EMPTY_COLS,
    })
    expect(result).toEqual({
      kind: 'inheritance',
      fromPetId: 'p_x',
      fragmentText: 'y',
    })
  })

  it('event: 新列填了，meta JSON 反序列化', () => {
    const result = rowToPayload({
      kind: 'event',
      payload: '{}',
      ...EMPTY_COLS,
      event_name: 'died',
      event_meta: '{"reason":"timeout"}',
    })
    expect(result).toEqual({
      kind: 'event',
      event: 'died',
      meta: { reason: 'timeout' },
    })
  })

  it('event: 新列填了 + meta null', () => {
    const result = rowToPayload({
      kind: 'event',
      payload: '{}',
      ...EMPTY_COLS,
      event_name: 'born',
    })
    if (result.kind !== 'event') throw new Error('expected event')
    expect(result.event).toBe('born')
    expect(result.meta).toBeUndefined()
  })

  it('narrative: 优先新列', () => {
    const result = rowToPayload({
      kind: 'narrative',
      payload: '{}',
      ...EMPTY_COLS,
      narrative_title: '它的一生',
      narrative_body: '故事...',
      narrative_model_id: 'opus-4.6',
      narrative_cause: 'released',
    })
    expect(result).toEqual({
      kind: 'narrative',
      title: '它的一生',
      body: '故事...',
      modelId: 'opus-4.6',
      cause: 'released',
    })
  })

  it('preference: 新列只有 task_id；tags 从老 JSON fallback', () => {
    const result = rowToPayload({
      kind: 'preference',
      payload: '{"kind":"preference","tags":["猫","咖啡"],"confidence":0.9,"taskId":"WRONG"}',
      ...EMPTY_COLS,
      preference_task_id: 't_correct',
    })
    expect(result.kind).toBe('preference')
    if (result.kind !== 'preference') throw new Error('expected preference')
    expect(result.tags).toEqual(['猫', '咖啡'])
    expect(result.confidence).toBe(0.9)
    expect(result.taskId).toBe('t_correct') // 新列优先
  })

  it('preference: 老 JSON 缺失 → 空 tags + 默认 confidence', () => {
    const result = rowToPayload({
      kind: 'preference',
      payload: '',
      ...EMPTY_COLS,
      preference_task_id: 't_x',
    })
    expect(result.kind).toBe('preference')
    if (result.kind !== 'preference') throw new Error('expected preference')
    expect(result.tags).toEqual([])
    expect(result.confidence).toBe(1.0)
  })

  it('全 null 兜底：构造空 shape', () => {
    const result = rowToPayload({
      kind: 'narrative',
      payload: '',
      ...EMPTY_COLS,
    })
    expect(result.kind).toBe('narrative')
    if (result.kind !== 'narrative') throw new Error('expected narrative')
    expect(result.title).toBe('')
    expect(result.cause).toBe('died')
  })

  it('JSON 损坏 + 全 null → 兜底', () => {
    const result = rowToPayload({
      kind: 'event',
      payload: 'not-json',
      ...EMPTY_COLS,
    })
    expect(result.kind).toBe('event')
  })
})

describe('round-trip: split → row → reconstruct', () => {
  function roundTrip(payload: MemoryPayload): MemoryPayload {
    const cols = splitPayloadIntoColumns(payload)
    return rowToPayload({
      kind: payload.kind,
      payload: JSON.stringify(payload), // 模拟双写
      ...cols,
    })
  }

  it('inheritance', () => {
    const p: MemoryPayload = {
      kind: 'inheritance',
      fromPetId: 'p_a',
      fragmentText: '尾巴像扫帚',
    }
    expect(roundTrip(p)).toEqual(p)
  })

  it('event 含 meta', () => {
    const p: MemoryPayload = {
      kind: 'event',
      event: 'task_passed',
      meta: { taskId: 't_1' },
    }
    expect(roundTrip(p)).toEqual(p)
  })

  it('narrative', () => {
    const p: MemoryPayload = {
      kind: 'narrative',
      title: '一生',
      body: '...',
      modelId: 'opus-4.6',
      cause: 'died',
    }
    expect(roundTrip(p)).toEqual(p)
  })
})
