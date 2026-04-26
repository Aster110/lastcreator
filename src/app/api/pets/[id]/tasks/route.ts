import { NextResponse } from 'next/server'
import { ensureSubscribers } from '@/lib/events/subscribers'
import { resolveUser } from '@/lib/identity'
import { getFullPet } from '@/lib/repo/petState'
import { randomAssigner } from '@/lib/game/tasks/assigner'
import { computeWorld } from '@/lib/game/world'
import { nowSlotFromDate } from '@/lib/game/tasks/taskPrompt'
import { getUserPreference } from '@/lib/game/profile/aggregator'
import {
  countCompletedToday,
  countRerollsTodayByOwner,
  listHistoryForPet,
} from '@/lib/repo/tasks'
import { MAX_DAILY_TASKS, MAX_DAILY_REROLLS } from '@/lib/game/rules'
import type { DisplayTask, Task } from '@/types/task'

/**
 * GET /api/pets/:id/tasks
 * 查/派 pet 的当前任务 + 返回最近 20 条历史 + v3.8 reroll 剩余次数。
 * 只有 owner 能访问。pet 非 alive 时不派新任务，但仍返回 history。
 *
 * v3.8: outdoorAllowed 自适应——当天该 owner 已 reroll 过任何一次，本次派单 outdoor 权重 → 0。
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

    const rerollsUsed = await countRerollsTodayByOwner(userId)
    const remainingRerolls = Math.max(0, MAX_DAILY_REROLLS - rerollsUsed)

    let task = null
    if (pet.status === 'alive') {
      const world = await computeWorld()
      // v4.1: 派单前算 owner 偏好画像，注入 PickOptions（命中模板 ×1.5 权重）
      const userPreference = await getUserPreference(userId)
      task = await randomAssigner.getOrAssign(pet, world, {
        nowSlot: nowSlotFromDate(),
        outdoorAllowed: rerollsUsed === 0,
        userPreference,
      })
    }
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
      remainingRerolls,
      maxRerolls: MAX_DAILY_REROLLS,
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
    actualKind: t.actualKind ?? null,
    prompt: t.prompt,
    reward: t.reward,
    status: t.status,
    expiresAt: t.expiresAt,
    proofR2Key: t.proofR2Key,
    aiVerdict: t.aiVerdict,
  }
}
