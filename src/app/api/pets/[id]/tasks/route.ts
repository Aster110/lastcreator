import { NextResponse } from 'next/server'
import { ensureSubscribers } from '@/lib/events/subscribers'
import { resolveUser } from '@/lib/identity'
import { getFullPet } from '@/lib/repo/petState'
import { randomAssigner } from '@/lib/game/tasks/assigner'
import { countCompletedToday, listHistoryForPet } from '@/lib/repo/tasks'
import { MAX_DAILY_TASKS } from '@/lib/game/rules'
import type { DisplayTask, Task } from '@/types/task'

/**
 * GET /api/pets/:id/tasks
 * 查/派 pet 的当前任务 + 返回最近 20 条历史。幂等，lazy 派发。
 * 只有 owner 能访问（否则任何人进 /me/[id] 都会触发派单）。
 * pet 非 alive 时不派新任务，但仍返回 history。
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

    const task = pet.status === 'alive' ? await randomAssigner.getOrAssign(id) : null
    const [dailyDone, historyRaw] = await Promise.all([
      countCompletedToday(id),
      listHistoryForPet(id, 20),
    ])

    const display = task ? toDisplay(task) : null
    const history: DisplayTask[] = historyRaw.map(toDisplay)

    return NextResponse.json({
      active: display,
      dailyDone,
      dailyMax: MAX_DAILY_TASKS,
      history,
    })
  } catch (err) {
    console.error('[/api/pets/[id]/tasks]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

function toDisplay(t: Task): DisplayTask {
  return {
    id: t.id,
    kind: t.kind,
    prompt: t.prompt,
    reward: t.reward,
    status: t.status,
    expiresAt: t.expiresAt,
    proofR2Key: t.proofR2Key,
    aiVerdict: t.aiVerdict,
  }
}
