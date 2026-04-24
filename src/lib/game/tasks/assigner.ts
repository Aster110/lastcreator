import { prefixedId } from '@/lib/db/nanoid'
import { createTask, findActiveTaskForPet, countCompletedToday } from '@/lib/repo/tasks'
import { MAX_DAILY_TASKS } from '@/lib/game/rules'
import { randomTemplate } from './templates'
import { emit } from '@/lib/events'
import type { Task } from '@/types/task'

export interface TaskAssigner {
  /** 若已有 active task 直接返回；否则按策略派发；达上限返回 null */
  getOrAssign(petId: string): Promise<Task | null>
}

export const randomAssigner: TaskAssigner = {
  async getOrAssign(petId) {
    // 1. 已有 active → 返回
    const existing = await findActiveTaskForPet(petId)
    if (existing) return existing

    // 2. 今日完成上限检查
    const done = await countCompletedToday(petId)
    if (done >= MAX_DAILY_TASKS) return null

    // 3. 派发新任务
    const tpl = randomTemplate()
    const taskId = prefixedId('t')
    const now = Date.now()
    const task = await createTask({
      id: taskId,
      petId,
      kind: tpl.kind,
      prompt: tpl.prompt,
      verifyHint: tpl.verifyHint,
      reward: tpl.reward,
      expiresAt: now + tpl.expiresInMs,
    })
    emit({ type: 'task.assigned', taskId: task.id, petId, kind: task.kind, at: now })
    return task
  },
}
