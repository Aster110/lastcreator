import { NextResponse } from 'next/server'
import { ensureSubscribers } from '@/lib/events/subscribers'
import { resolveUser } from '@/lib/identity'
import { getFullPet } from '@/lib/repo/petState'
import { randomAssigner } from '@/lib/game/tasks/assigner'
import { countCompletedToday } from '@/lib/repo/tasks'
import { MAX_DAILY_TASKS } from '@/lib/game/rules'
import type { DisplayTask } from '@/types/task'

/**
 * GET /api/pets/:id/tasks
 * 查/派 pet 的当前任务。幂等，lazy 派发。
 * 只有 owner 能访问（否则任何人进 /me/[id] 都会触发派单）。
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureSubscribers()
  const { id } = await params
  if (!id?.startsWith('p_')) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }
  try {
    const { userId } = await resolveUser()
    const pet = await getFullPet(id)
    if (!pet) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (pet.ownerId !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const task = await randomAssigner.getOrAssign(id)
    const dailyDone = await countCompletedToday(id)
    const display: DisplayTask | null = task
      ? {
          id: task.id,
          kind: task.kind,
          prompt: task.prompt,
          reward: task.reward,
          status: task.status,
          expiresAt: task.expiresAt,
          proofR2Key: task.proofR2Key,
          aiVerdict: task.aiVerdict,
        }
      : null
    return NextResponse.json({ active: display, dailyDone, dailyMax: MAX_DAILY_TASKS })
  } catch (err) {
    console.error('[/api/pets/[id]/tasks]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
