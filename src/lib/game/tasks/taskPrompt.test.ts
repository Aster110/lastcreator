/**
 * v3.8 taskPrompt 纯函数测试
 * - nowSlotFromDate 四档划分
 * - buildPromptContext 返正确 shape
 * - pickTemplateForPet 按 element 分桶 + v3.8 context 加权
 *   * nowSlot=night → 0% outdoor
 *   * outdoorAllowed=false → 0% outdoor
 *   * 默认（白天 + allowed）outdoor 占比合理 (> 0)
 */
import { describe, it, expect } from 'vitest'
import {
  nowSlotFromDate,
  buildPromptContext,
  pickTemplateForPet,
  preferenceWeight,
  W_PREFERENCE_HIT,
} from './taskPrompt'
import type { TaskTemplate } from './templates'
import type { UserPreference } from '@/types/profile'
import type { FullPet, ElementId } from '@/types/pet'

function mockPet(overrides: Partial<FullPet> = {}): FullPet {
  return {
    id: 'p_mock',
    ownerId: 'u_mock',
    name: '灰鬃',
    habitat: '废墟',
    personality: '倔强',
    skills: ['潜行'],
    hp: 100,
    exp: 0,
    story: '',
    stage: '幼年',
    status: 'alive',
    imageR2Key: 'pets/mock/image.png',
    imageUrl: 'https://media.lastcreator.cc/pets/mock/image.png',
    imageOriginUrl: null,
    doodleR2Key: null,
    element: 'ruins' as ElementId,
    createdAt: 1000,
    updatedAt: 1000,
    lifeExpiresAt: 2000,
    mood: null,
    extra: {},
    ...overrides,
  } as FullPet
}

describe('nowSlotFromDate', () => {
  it('3am → night', () => {
    expect(nowSlotFromDate(new Date('2026-04-25T03:00:00'))).toBe('night')
  })
  it('8am → morning', () => {
    expect(nowSlotFromDate(new Date('2026-04-25T08:00:00'))).toBe('morning')
  })
  it('14pm → afternoon', () => {
    expect(nowSlotFromDate(new Date('2026-04-25T14:00:00'))).toBe('afternoon')
  })
  it('19pm → evening', () => {
    expect(nowSlotFromDate(new Date('2026-04-25T19:00:00'))).toBe('evening')
  })
  it('23pm → night', () => {
    expect(nowSlotFromDate(new Date('2026-04-25T23:00:00'))).toBe('night')
  })
})

describe('buildPromptContext', () => {
  it('returns full context shape', () => {
    const pet = mockPet()
    const template = {
      id: 't1',
      kind: 'photo' as const,
      element: 'ruins' as const,
      context: 'any' as const,
      promptSkeleton: '找 {subject}',
      slots: ['subject'],
      defaultPrompt: '找食物',
      verifyHint: '有吃的',
      reward: { minutes: 400 },
      expiresInMs: 86400000,
    }
    const world = { dayCount: 5 }
    const ctx = buildPromptContext(template, pet, world, new Date('2026-04-25T09:00:00'))

    expect(ctx.template).toBe(template)
    expect(ctx.pet.name).toBe('灰鬃')
    expect(ctx.pet.element).toBe('ruins')
    expect(ctx.pet.personality).toBe('倔强')
    expect(ctx.pet.stage).toBe('幼年')
    expect(ctx.world.dayCount).toBe(5)
    expect(ctx.nowSlot).toBe('morning')
  })
})

describe('pickTemplateForPet', () => {
  it('returns a template (not null) for any pet', () => {
    const pet = mockPet({ element: 'fire' })
    // 重复 20 次都应该返回模板
    for (let i = 0; i < 20; i++) {
      const t = pickTemplateForPet(pet)
      expect(t).toBeTruthy()
      expect(t.id).toBeTruthy()
    }
  })

  it('with pet.element=ruins, most picks are ruins OR generic (never other element)', () => {
    const pet = mockPet({ element: 'ruins' })
    for (let i = 0; i < 30; i++) {
      const t = pickTemplateForPet(pet)
      // 可以是 ruins（专属）或 null（通用），但不该是 fire/water/...
      if (t.element !== null && t.element !== 'ruins') {
        throw new Error(`ruins pet got ${t.element} template`)
      }
    }
  })

  it('pet without element (null) → returns generic templates', () => {
    const pet = mockPet({ element: null })
    for (let i = 0; i < 10; i++) {
      const t = pickTemplateForPet(pet)
      expect(t.element).toBeNull()
    }
  })
})

describe('v3.8 pickTemplateForPet context filtering', () => {
  it('nowSlot=night → 0% outdoor templates', () => {
    const pet = mockPet({ element: 'sky' })  // sky 池含 outdoor，最易暴露 bug
    for (let i = 0; i < 500; i++) {
      const t = pickTemplateForPet(pet, Math.random, { nowSlot: 'night' })
      expect(t.context, `iteration ${i}, template ${t.id}`).not.toBe('outdoor')
    }
  })

  it('outdoorAllowed=false → 0% outdoor templates', () => {
    const pet = mockPet({ element: 'sky' })
    for (let i = 0; i < 500; i++) {
      const t = pickTemplateForPet(pet, Math.random, { outdoorAllowed: false })
      expect(t.context, `iteration ${i}, template ${t.id}`).not.toBe('outdoor')
    }
  })

  it('default (daytime, allowed) → outdoor occurs but not majority', () => {
    const pet = mockPet({ element: 'sky' })
    let outdoor = 0
    let total = 0
    for (let i = 0; i < 2000; i++) {
      const t = pickTemplateForPet(pet, Math.random, { nowSlot: 'morning' })
      if (t.context === 'outdoor') outdoor++
      total++
    }
    const ratio = outdoor / total
    // sky 池含 outdoor 较多，但加权 0.4 + generic 池稀释，期望 < 50%
    expect(ratio, `outdoor ratio = ${ratio}`).toBeGreaterThan(0)
    expect(ratio, `outdoor ratio = ${ratio}`).toBeLessThan(0.5)
  })

  it('null-element pet 默认 outdoor 占比 < 20%（generic 池只有 1 条 outdoor）', () => {
    const pet = mockPet({ element: null })
    let outdoor = 0
    const N = 2000
    for (let i = 0; i < N; i++) {
      const t = pickTemplateForPet(pet, Math.random, { nowSlot: 'morning' })
      if (t.context === 'outdoor') outdoor++
    }
    const ratio = outdoor / N
    expect(ratio, `outdoor ratio = ${ratio}`).toBeLessThan(0.2)
  })
})

// =============================================================================
// v4.1 preferenceWeight + pickTemplate preference 加权
// =============================================================================

function pref(...tags: string[]): UserPreference {
  return {
    ownerId: 'u_test',
    topTags: tags.map(tag => ({ tag, count: 1, weight: 1.0 })),
    totalMemories: tags.length,
    lastUpdated: 1000,
  }
}

const FOOD_TEMPLATE: TaskTemplate = {
  id: 'ruins-food',
  kind: 'photo',
  element: 'ruins',
  context: 'any',
  promptSkeleton: '末日里我饿了，帮我找 {subject}',
  slots: ['subject'],
  defaultPrompt: '末日里我饿了，帮我找点能吃的',
  verifyHint: '图中包含食物、水果、饮品或任何可食用的东西',
  reward: { minutes: 420, exp: 20 },
  expiresInMs: 86400000,
}

describe('v4.1 preferenceWeight', () => {
  it('userPreference undefined → 1.0', () => {
    expect(preferenceWeight(FOOD_TEMPLATE, undefined)).toBe(1.0)
  })

  it('topTags 空 → 1.0', () => {
    expect(preferenceWeight(FOOD_TEMPLATE, pref())).toBe(1.0)
  })

  it('tag 命中 verifyHint → 1.5', () => {
    // "食物" 在 ruins-food 的 verifyHint 里
    expect(preferenceWeight(FOOD_TEMPLATE, pref('食物'))).toBe(W_PREFERENCE_HIT)
  })

  it('tag 命中 defaultPrompt → 1.5', () => {
    // "饿" 在 defaultPrompt 里
    expect(preferenceWeight(FOOD_TEMPLATE, pref('饿'))).toBe(W_PREFERENCE_HIT)
  })

  it('tag 完全不命中 → 1.0', () => {
    expect(preferenceWeight(FOOD_TEMPLATE, pref('量子物理', '机器学习'))).toBe(1.0)
  })

  it('多 tag 任一命中即触发', () => {
    expect(preferenceWeight(FOOD_TEMPLATE, pref('量子物理', '水果'))).toBe(W_PREFERENCE_HIT)
  })

  it('空字符串 tag 不误命中', () => {
    expect(preferenceWeight(FOOD_TEMPLATE, pref(''))).toBe(1.0)
  })
})

describe('v4.1 pickTemplateForPet with userPreference', () => {
  it('preference 命中 → 该模板被抽中概率显著上升', () => {
    const pet = mockPet({ element: 'ruins' })
    const userPreference = pref('食物') // ruins-food 命中
    let foodCount = 0
    let baselineCount = 0
    const N = 2000

    // 有 preference 跑 N 次
    for (let i = 0; i < N; i++) {
      const t = pickTemplateForPet(pet, Math.random, { userPreference, nowSlot: 'morning' })
      if (t.id === 'ruins-food') foodCount++
    }
    // 无 preference 基线 N 次
    for (let i = 0; i < N; i++) {
      const t = pickTemplateForPet(pet, Math.random, { nowSlot: 'morning' })
      if (t.id === 'ruins-food') baselineCount++
    }

    const ratioWithPref = foodCount / N
    const ratioBaseline = baselineCount / N
    // 加权后命中模板占比应高于基线（×1.5 加权）
    expect(ratioWithPref, `with pref ${ratioWithPref} vs baseline ${ratioBaseline}`).toBeGreaterThan(ratioBaseline)
  })

  it('preference 命中无效模板 → 不影响分布', () => {
    const pet = mockPet({ element: 'ruins' })
    const userPreference = pref('量子物理') // 不命中任何 ruins 模板
    const counts = new Map<string, number>()
    const N = 1000
    for (let i = 0; i < N; i++) {
      const t = pickTemplateForPet(pet, Math.random, { userPreference, nowSlot: 'morning' })
      counts.set(t.id, (counts.get(t.id) ?? 0) + 1)
    }
    // 至少抽到 4 种 ruins 模板（说明没被锁死在某一个上）
    const ruinsTemplates = [...counts.keys()].filter(id => id.startsWith('ruins-'))
    expect(ruinsTemplates.length, `got ${ruinsTemplates.join(',')}`).toBeGreaterThanOrEqual(3)
  })
})
