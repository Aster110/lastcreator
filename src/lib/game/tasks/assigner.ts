import { prefixedId } from '@/lib/db/nanoid'
import { createTask, findActiveTaskForPet, countCompletedToday } from '@/lib/repo/tasks'
import { MAX_DAILY_TASKS } from '@/lib/game/rules'
import { pickTemplateForPet, buildPromptContext } from './taskPrompt'
import { taskPromptAI } from '@/lib/ai/taskPrompt'
import { emit } from '@/lib/events'
import type { Task } from '@/types/task'
import type { FullPet } from '@/types/pet'
import type { TaskTemplate } from './templates'

// v3.7: 可测试性——允许注入不同 AI 实现
type AIFill = typeof taskPromptAI

export interface TaskAssigner {
  /**
   * 若已有 active task 直接返回；否则按策略派发；达上限返回 null。
   * v3.7: 需要 pet 完整对象（for element 分桶 + AI 填空）+ world 状态
   */
  getOrAssign(pet: FullPet, world: { dayCount: number }): Promise<Task | null>
}

/** 工厂：便于测试注入 mock AI */
export function makeAssigner(ai: AIFill = taskPromptAI): TaskAssigner {
  return {
    async getOrAssign(pet, world) {
      // 1. 已有 active → 返回
      const existing = await findActiveTaskForPet(pet.id)
      if (existing) return existing

      // 2. 今日完成上限检查
      const done = await countCompletedToday(pet.id)
      if (done >= MAX_DAILY_TASKS) return null

      // 3. 按 element 分桶选模板
      const template: TaskTemplate = pickTemplateForPet(pet)

      // 4. 尝试 AI 填空；失败 → fallback 到 defaultPrompt
      let prompt = template.defaultPrompt
      let verifyHint = template.verifyHint
      try {
        const ctx = buildPromptContext(template, pet, world)
        const filled = await ai.fill(ctx)
        prompt = filled.prompt
        verifyHint = filled.verifyHint
      } catch (err) {
        // 日志一下，不炸（保证 task 创建成功）
        console.warn(
          `[assigner] AI fill failed for template ${template.id}, using default:`,
          err instanceof Error ? err.message : String(err),
        )
      }

      // 5. 创建任务
      const taskId = prefixedId('t')
      const now = Date.now()
      const task = await createTask({
        id: taskId,
        petId: pet.id,
        kind: template.kind,
        prompt,
        verifyHint,
        reward: template.reward,
        expiresAt: now + template.expiresInMs,
      })
      emit({ type: 'task.assigned', taskId: task.id, petId: pet.id, kind: task.kind, at: now })
      return task
    },
  }
}

/** 默认 assigner（生产用） */
export const randomAssigner: TaskAssigner = makeAssigner()
