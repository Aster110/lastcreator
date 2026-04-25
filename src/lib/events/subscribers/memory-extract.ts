import { on } from '@/lib/events'
import { haikuMemoryExtractor } from '@/lib/ai/memoryExtractor'
import { addMemory } from '@/lib/repo/memories'
import { getTask } from '@/lib/repo/tasks'
import { getFullPet } from '@/lib/repo/petState'
import { publicUrl } from '@/lib/storage/r2'

/**
 * v3.9.2 订阅 task.completed：异步从已 verify 的照片 extract 用户偏好 tags，
 * 写 memories(kind='preference')。
 *
 * 仅 photo 类提交触发；涂鸦不 extract（噪音多）。
 * 失败 silent（不影响主流程，已 verify 的任务仍 done）。
 */
export function registerMemoryExtractSubscriber(): void {
  on('task.completed', async e => {
    try {
      const task = await getTask(e.taskId)
      if (!task) return
      const actualKind = task.actualKind ?? task.kind
      if (actualKind !== 'photo') return // 仅 photo 提交参与学习
      if (!task.proofR2Key) return

      const pet = await getFullPet(task.petId)
      if (!pet) return

      const imageUrl = publicUrl(task.proofR2Key)
      const records = await haikuMemoryExtractor.extract({
        taskId: e.taskId,
        petId: pet.id,
        ownerId: pet.ownerId,
        imageUrl,
        verdict: task.aiVerdict ?? { pass: true, completion: 1, reason: '' },
      })
      for (const r of records) {
        await addMemory(r)
      }
      if (records.length > 0) {
        const tags = records
          .flatMap(r => (r.payload.kind === 'preference' ? r.payload.tags : []))
          .join(',')
        console.log(`[memory-extract] task=${e.taskId} pet=${pet.id} tags=[${tags}]`)
      }
    } catch (err) {
      console.error('[memory-extract] failed', e.taskId, err)
    }
  })
}
