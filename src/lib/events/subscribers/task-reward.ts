import { on } from '@/lib/events'

/**
 * v3 占位订阅者：task.completed 事件。
 * 实际的 reward 应用由 submit API 同步执行（前端要拿新 state），
 * 这里只做"非本次前端依赖的副作用"：审计 log、未来通知等。
 */
export function registerTaskRewardSubscriber(): void {
  on('task.completed', e => {
    console.log(`[task-reward] task=${e.taskId} pet=${e.petId} reward=${JSON.stringify(e.reward)}`)
    // v3.1 加：写 memories.kind='task' 条目
    // v4 加：飞书/微信通知 owner
  })
}
