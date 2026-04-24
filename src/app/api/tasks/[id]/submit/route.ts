import { NextRequest, NextResponse } from 'next/server'
import { ensureSubscribers } from '@/lib/events/subscribers'
import { resolveUser } from '@/lib/identity'
import { getTask, updateTaskStatus } from '@/lib/repo/tasks'
import { getFullPet } from '@/lib/repo/petState'
import { alwaysPassVerifier } from '@/lib/game/tasks/verifier'
import { applyReward } from '@/lib/game/tasks/rewards'
import { r2PutFromDataUrl } from '@/lib/storage/r2'
import { emit } from '@/lib/events'
import type { TaskProof, DisplayTask } from '@/types/task'

/**
 * POST /api/tasks/:id/submit
 * body: { dataUrl: 'data:image/png;base64,...' }
 * 流程：校验 owner → 上传 proof R2 → verifier.verify → 若 pass 应用 reward → emit
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureSubscribers()
  const { id } = await params
  if (!id?.startsWith('t_')) {
    return NextResponse.json({ error: 'invalid task id' }, { status: 400 })
  }

  let body: { dataUrl?: string }
  try {
    body = (await req.json()) as { dataUrl?: string }
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  if (!body.dataUrl) return NextResponse.json({ error: 'missing dataUrl' }, { status: 400 })

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

    // 1. 上传 proof 到 R2
    const r2Key = `tasks/${id}/proof.png`
    const { publicUrl } = await r2PutFromDataUrl(body.dataUrl, r2Key)

    // 2. 标记 submitted
    const now = Date.now()
    await updateTaskStatus(id, 'submitted', { proofR2Key: r2Key, submittedAt: now })
    emit({ type: 'task.submitted', taskId: id, petId: task.petId, proofR2Key: r2Key, at: now })

    // 3. 验证
    const proof: TaskProof = { kind: task.kind, r2Key, imageUrl: publicUrl }
    const verdict = await alwaysPassVerifier.verify(task, proof)

    if (!verdict.pass) {
      await updateTaskStatus(id, 'rejected', { aiVerdict: verdict })
      emit({ type: 'task.rejected', taskId: id, petId: task.petId, reason: verdict.reason, at: Date.now() })
      return NextResponse.json({
        task: toDisplay(id, task.kind, task.prompt, task.reward, 'rejected', task.expiresAt, r2Key, verdict),
        verdict,
      })
    }

    // 4. pass → 结算
    await updateTaskStatus(id, 'done', { aiVerdict: verdict, completedAt: Date.now() })
    const newState = await applyReward(task.petId, task.reward)
    emit({ type: 'task.completed', taskId: id, petId: task.petId, reward: task.reward, at: Date.now() })

    return NextResponse.json({
      task: toDisplay(id, task.kind, task.prompt, task.reward, 'done', task.expiresAt, r2Key, verdict),
      verdict,
      state: newState,
    })
  } catch (err) {
    console.error('[/api/tasks/[id]/submit]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

function toDisplay(
  id: string,
  kind: TaskProof['kind'],
  prompt: string,
  reward: DisplayTask['reward'],
  status: DisplayTask['status'],
  expiresAt: number,
  proofR2Key: string | null,
  aiVerdict: DisplayTask['aiVerdict'],
): DisplayTask {
  return { id, kind, prompt, reward, status, expiresAt, proofR2Key, aiVerdict }
}
