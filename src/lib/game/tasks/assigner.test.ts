/**
 * v3.7 assigner 测试
 * - AI fill 成功 → prompt 用 AI 生成结果
 * - AI fill 失败 → fallback 到 template.defaultPrompt
 *
 * 注：测试只验证 assigner 的"fallback 行为"这个关键逻辑。
 * repo 层（createTask / findActiveTaskForPet / countCompletedToday）不 mock DB，
 * 而是直接验证 makeAssigner(ai) 工厂的 AI 参数接入是否正确。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeAssigner } from './assigner'
import type { FullPet } from '@/types/pet'
import type { FilledTask } from '@/lib/ai/taskPrompt'

// Mock repo 层 —— 测试不碰 DB
vi.mock('@/lib/repo/tasks', () => ({
  createTask: vi.fn(async (data: unknown) => {
    const d = data as { id: string; kind: string; prompt: string; verifyHint: string }
    return {
      id: d.id,
      petId: 'p_mock',
      kind: d.kind,
      prompt: d.prompt,
      verifyHint: d.verifyHint,
      reward: { minutes: 400 },
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      proofR2Key: null,
      aiVerdict: null,
    }
  }),
  findActiveTaskForPet: vi.fn(async () => null),
  countCompletedToday: vi.fn(async () => 0),
}))

vi.mock('@/lib/events', () => ({
  emit: vi.fn(),
}))

vi.mock('@/lib/db/nanoid', () => ({
  prefixedId: (p: string) => `${p}_stub`,
}))

function mockPet(): FullPet {
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
    memoryFromPetId: null,
    memoryFragment: null,
    element: 'ruins',
    createdAt: 1000,
    updatedAt: 1000,
    lifeExpiresAt: 2000,
    mood: null,
    extra: {},
  } as FullPet
}

describe('assigner · AI fill integration', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('uses AI-filled prompt when AI succeeds', async () => {
    const mockAI = {
      async fill(): Promise<FilledTask> {
        return {
          prompt: '灰鬃今天想看你冰箱里的一切',
          verifyHint: '图中有食物',
        }
      },
    }
    const assigner = makeAssigner(mockAI)
    const task = await assigner.getOrAssign(mockPet(), { dayCount: 1 })
    expect(task).toBeTruthy()
    expect(task!.prompt).toBe('灰鬃今天想看你冰箱里的一切')
  })

  it('falls back to defaultPrompt when AI throws', async () => {
    const mockAI = {
      async fill(): Promise<FilledTask> {
        throw new Error('openrouter 503')
      },
    }
    const assigner = makeAssigner(mockAI)
    const task = await assigner.getOrAssign(mockPet(), { dayCount: 1 })
    expect(task).toBeTruthy()
    // defaultPrompt 的值一定不是 AI 生成的那个；应该是模板里硬编的
    expect(task!.prompt).not.toBe('灰鬃今天想看你冰箱里的一切')
    // 应该有警告日志
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('respects element bucket: ruins pet gets ruins or generic template', async () => {
    const mockAI = {
      async fill(ctx: { template: { id: string } }): Promise<FilledTask> {
        return {
          prompt: `[from ${ctx.template.id}]`,
          verifyHint: '照搬',
        }
      },
    }
    const assigner = makeAssigner(mockAI)
    const runs = await Promise.all(
      Array.from({ length: 10 }, () => assigner.getOrAssign(mockPet(), { dayCount: 1 })),
    )
    for (const task of runs) {
      expect(task).toBeTruthy()
      const match = task!.prompt.match(/\[from (.+)\]/)
      expect(match).toBeTruthy()
      const templateId = match![1]
      // 必须是 ruins-* 或 generic-*，不能是其他元素
      expect(templateId).toMatch(/^(ruins-|generic-)/)
    }
  })
})

describe('v3.8 assigner · PickOptions context filtering', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('outdoorAllowed=false → never picks outdoor template (sky pet)', async () => {
    const mockAI = {
      async fill(ctx: { template: { id: string; context: string } }): Promise<FilledTask> {
        return {
          prompt: `[id:${ctx.template.id}|ctx:${ctx.template.context}]`,
          verifyHint: '_',
        }
      },
    }
    const assigner = makeAssigner(mockAI)
    const skyPet = { ...mockPet(), element: 'sky' as const } as FullPet

    for (let i = 0; i < 50; i++) {
      const task = await assigner.getOrAssign(
        skyPet,
        { dayCount: 1 },
        { outdoorAllowed: false },
      )
      expect(task).toBeTruthy()
      const m = task!.prompt.match(/\|ctx:(\w+)\]/)
      expect(m, `prompt=${task!.prompt}`).toBeTruthy()
      expect(m![1]).not.toBe('outdoor')
    }
  })

  it('nowSlot=night → never picks outdoor template', async () => {
    const mockAI = {
      async fill(ctx: { template: { id: string; context: string } }): Promise<FilledTask> {
        return {
          prompt: `[id:${ctx.template.id}|ctx:${ctx.template.context}]`,
          verifyHint: '_',
        }
      },
    }
    const assigner = makeAssigner(mockAI)
    const skyPet = { ...mockPet(), element: 'sky' as const } as FullPet

    for (let i = 0; i < 50; i++) {
      const task = await assigner.getOrAssign(
        skyPet,
        { dayCount: 1 },
        { nowSlot: 'night' },
      )
      expect(task).toBeTruthy()
      const m = task!.prompt.match(/\|ctx:(\w+)\]/)
      expect(m![1]).not.toBe('outdoor')
    }
  })
})
