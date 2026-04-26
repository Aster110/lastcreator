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
} from './taskPrompt'
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
