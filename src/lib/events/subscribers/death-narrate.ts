import { on } from '@/lib/events'
import { opusDeathNarrator } from '@/lib/ai/deathNarrator'
import { addMemory, listByPet } from '@/lib/repo/memories'
import { listHistoryForPet } from '@/lib/repo/tasks'
import { getFullPet } from '@/lib/repo/petState'

/**
 * v3.9.3 订阅 pet.died / pet.released：
 * - 取宠物完整档案 + 任务履历 + 已收集的 preference memories
 * - 调 narrator 生成"它的一生" → addMemory(kind='narrative')
 * - 失败 silent，墓碑页访问时若无 narrative 用占位文案兜底
 */
export function registerDeathNarrateSubscriber(): void {
  const handler = (cause: 'died' | 'released') => async (e: { petId: string }) => {
    try {
      const pet = await getFullPet(e.petId)
      if (!pet) return
      const [tasks, memories] = await Promise.all([
        listHistoryForPet(pet.id, 50),
        listByPet(pet.id, 50),
      ])
      const out = await opusDeathNarrator.narrate({ pet, tasks, memories, cause })
      await addMemory({
        petId: pet.id,
        ownerId: pet.ownerId,
        kind: 'narrative',
        source: 'death',
        sourceRef: pet.id,
        payload: {
          kind: 'narrative',
          title: out.title,
          body: out.body,
          modelId: out.modelId,
          cause,
        },
      })
      console.log(`[death-narrate] pet=${pet.id} cause=${cause} title="${out.title}"`)
    } catch (err) {
      console.error('[death-narrate] failed', e.petId, err)
    }
  }

  on('pet.died', handler('died'))
  on('pet.released', handler('released'))
}
