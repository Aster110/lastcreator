import { NextRequest, NextResponse } from 'next/server'
import { ensureSubscribers } from '@/lib/events/subscribers'
import { resolveUser } from '@/lib/identity'
import {
  getTask,
  cancelTaskAsReroll,
  countRerollsTodayByOwner,
} from '@/lib/repo/tasks'
import { getFullPet } from '@/lib/repo/petState'
import { computeWorld } from '@/lib/game/world'
import { randomAssigner } from '@/lib/game/tasks/assigner'
import { MAX_DAILY_REROLLS } from '@/lib/game/rules'
import { nowSlotFromDate } from '@/lib/game/tasks/taskPrompt'
import type { DisplayTask, Task } from '@/types/task'

/**
 * v3.8 POST /api/tasks/:id/reroll
 *
 * 把当前 active task 标 cancelled，重新派发一个。
 * - 校验 task 还是 pending（已 submit/done 不允许 reroll）
 * - 校验 owner（pet.ownerId === userId）
 * - 当天 reroll 用量必须 < MAX_DAILY_REROLLS（3）
 * - 派新时 outdoorAllowed=false（用户暗示卡在情境上）
 *
 * 返回 { task, remainingRerolls }；429 = 用量已满；403 = 非 owner。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureSubscribers()
  const { id } = await params
  if (!id?.startsWith('t_')) {
    return NextResponse.json({ error: 'invalid task id' }, { status: 400 })
  }

  try {
    const { userId } = await resolveUser()

    const task = await getTask(id)
    if (!task) return NextResponse.json({ error: 'task not found' }, { status: 404 })
    if (task.status !== 'pending') {
      return NextResponse.json({ error: `task status ${task.status}` }, { status: 409 })
    }

    const pet = await getFullPet(task.petId)
    if (!pet) return NextResponse.json({ error: 'pet not found' }, { status: 404 })
    if (pet.ownerId !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (pet.status !== 'alive') {
      return NextResponse.json({ error: `pet is ${pet.status}` }, { status: 409 })
    }

    const used = await countRerollsTodayByOwner(userId)
    if (used >= MAX_DAILY_REROLLS) {
      return NextResponse.json(
        { error: 'reroll_limit_reached', remainingRerolls: 0 },
        { status: 429 },
      )
    }

    await cancelTaskAsReroll(id)

    const world = await computeWorld()
    const newTask = await randomAssigner.getOrAssign(pet, world, {
      nowSlot: nowSlotFromDate(),
      outdoorAllowed: false,
    })
    if (!newTask) {
      return NextResponse.json({ error: 'daily_limit_or_no_template' }, { status: 409 })
    }

    return NextResponse.json({
      task: toDisplay(newTask),
      remainingRerolls: MAX_DAILY_REROLLS - used - 1,
    })
  } catch (err) {
    console.error('[reroll] error', err)
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
