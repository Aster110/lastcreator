/**
 * v4.1 Phase A · rowToReward / rowToVerdict 纯函数测试
 *
 * 验证：
 *   - 优先读新列（已迁移的数据）
 *   - 新列全 NULL 时 fallback JSON（老数据未迁移）
 *   - 边界：unlockSkill 0/1/null、verdict.pass 0/1
 */
import { describe, it, expect } from 'vitest'
import { rowToReward, rowToVerdict } from '../tasks'

describe('rowToReward', () => {
  it('优先用新列：minutes + exp + unlockSkill 全填', () => {
    const result = rowToReward({
      reward: '{"minutes":999}', // JSON 故意填错值，应被忽略
      reward_minutes: 600,
      reward_exp: 30,
      reward_unlock_skill: 1,
    })
    expect(result).toEqual({ minutes: 600, exp: 30, unlockSkill: true })
  })

  it('新列只有 minutes，其余 null', () => {
    const result = rowToReward({
      reward: '{}',
      reward_minutes: 400,
      reward_exp: null,
      reward_unlock_skill: null,
    })
    expect(result).toEqual({ minutes: 400 })
    expect(result.exp).toBeUndefined()
    expect(result.unlockSkill).toBeUndefined()
  })

  it('reward_unlock_skill = 0 → unlockSkill 不出', () => {
    const result = rowToReward({
      reward: '{}',
      reward_minutes: 400,
      reward_exp: null,
      reward_unlock_skill: 0,
    })
    expect(result.unlockSkill).toBeUndefined()
  })

  it('新列全 NULL → fallback 解析 JSON', () => {
    const result = rowToReward({
      reward: '{"minutes":300,"exp":15}',
      reward_minutes: null,
      reward_exp: null,
      reward_unlock_skill: null,
    })
    expect(result).toEqual({ minutes: 300, exp: 15 })
  })

  it('JSON 损坏 + 新列全 NULL → 返空对象', () => {
    const result = rowToReward({
      reward: 'not-json',
      reward_minutes: null,
      reward_exp: null,
      reward_unlock_skill: null,
    })
    expect(result).toEqual({})
  })

  it('reward 字符串为空 + 新列全 NULL → 返空对象', () => {
    const result = rowToReward({
      reward: '',
      reward_minutes: null,
      reward_exp: null,
      reward_unlock_skill: null,
    })
    expect(result).toEqual({})
  })
})

describe('rowToVerdict', () => {
  it('新列全填', () => {
    const result = rowToVerdict({
      ai_verdict: '{"pass":false}', // JSON 应被忽略
      verdict_pass: 1,
      verdict_completion: 0.85,
      verdict_reason: '看到了猫',
    })
    expect(result).toEqual({ pass: true, completion: 0.85, reason: '看到了猫' })
  })

  it('verdict_pass = 0 → pass false', () => {
    const result = rowToVerdict({
      ai_verdict: null,
      verdict_pass: 0,
      verdict_completion: 0,
      verdict_reason: '不像积水',
    })
    expect(result?.pass).toBe(false)
    expect(result?.completion).toBe(0)
  })

  it('completion null → 默认 0', () => {
    const result = rowToVerdict({
      ai_verdict: null,
      verdict_pass: 1,
      verdict_completion: null,
      verdict_reason: null,
    })
    expect(result).toEqual({ pass: true, completion: 0, reason: '' })
  })

  it('新列全 NULL + 有老 JSON → fallback 解析', () => {
    const result = rowToVerdict({
      ai_verdict: '{"pass":true,"completion":0.7,"reason":"老数据"}',
      verdict_pass: null,
      verdict_completion: null,
      verdict_reason: null,
    })
    expect(result).toEqual({ pass: true, completion: 0.7, reason: '老数据' })
  })

  it('新列全 NULL + 无老 JSON → null', () => {
    const result = rowToVerdict({
      ai_verdict: null,
      verdict_pass: null,
      verdict_completion: null,
      verdict_reason: null,
    })
    expect(result).toBeNull()
  })

  it('JSON 损坏 + 新列全 NULL → null', () => {
    const result = rowToVerdict({
      ai_verdict: 'broken',
      verdict_pass: null,
      verdict_completion: null,
      verdict_reason: null,
    })
    expect(result).toBeNull()
  })
})
