import { on } from '@/lib/events'
import { randomAssigner } from '@/lib/game/tasks/assigner'
import { getFullPet } from '@/lib/repo/petState'
import { computeWorld } from '@/lib/game/world'

/**
 * 订阅 pet.born：宠物诞生后立即派第一个任务
 * 失败不影响诞生流程（emit 是异步，waitUntil 内）
 * v3.7: assigner 需要完整 pet 对象和 world 状态
 */
export function registerPetBornTaskSubscriber(): void {
  on('pet.born', async e => {
    try {
      const pet = await getFullPet(e.petId)
      if (!pet) return
      const world = await computeWorld()
      await randomAssigner.getOrAssign(pet, world)
    } catch (err) {
      console.error('[pet-born-task] assign failed', e.petId, err)
    }
  })
}
