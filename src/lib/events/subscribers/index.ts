import { registerTaskRewardSubscriber } from './task-reward'
import { registerPetBornTaskSubscriber } from './pet-born-task'

let registered = false

/**
 * 确保所有订阅者注册。module-level singleton，isolate 内只跑一次。
 * 每个 API route 顶部调一次（幂等）。
 */
export function ensureSubscribers(): void {
  if (registered) return
  registered = true
  registerTaskRewardSubscriber()
  registerPetBornTaskSubscriber()
}
