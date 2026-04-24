import { on } from '@/lib/events'
import { randomAssigner } from '@/lib/game/tasks/assigner'

/**
 * 订阅 pet.born：宠物诞生后立即派第一个任务
 * 失败不影响诞生流程（emit 是异步，waitUntil 内）
 */
export function registerPetBornTaskSubscriber(): void {
  on('pet.born', async e => {
    try {
      await randomAssigner.getOrAssign(e.petId)
    } catch (err) {
      console.error('[pet-born-task] assign failed', e.petId, err)
    }
  })
}
