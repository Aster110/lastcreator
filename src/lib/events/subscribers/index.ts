import { registerTaskRewardSubscriber } from './task-reward'
import { registerPetBornTaskSubscriber } from './pet-born-task'
import { registerMemoryExtractSubscriber } from './memory-extract'
import { registerDeathNarrateSubscriber } from './death-narrate'

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
  registerMemoryExtractSubscriber()  // v3.9.2: 异步从 photo 任务 extract preferences
  registerDeathNarrateSubscriber()   // v3.9.3: pet.died/released → 生成"它的一生"
}
