import { getDb } from '@/lib/db/client'
import type { Task, TaskKind, TaskStatus, Reward, TaskVerdict } from '@/types/task'

interface TaskRow {
  id: string
  pet_id: string
  kind: string
  /** v3.9.1: 用户实际提交的 kind（NULL 直到 submit） */
  actual_kind: string | null
  prompt: string
  reward: string
  status: string
  proof_r2_key: string | null
  ai_verdict: string | null
  verify_hint: string | null
  created_at: number
  submitted_at: number | null
  completed_at: number | null
  expires_at: number
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    petId: r.pet_id,
    kind: r.kind as TaskKind,
    actualKind: r.actual_kind ? (r.actual_kind as TaskKind) : null,
    prompt: r.prompt,
    verifyHint: r.verify_hint ?? '',
    reward: JSON.parse(r.reward),
    status: r.status as TaskStatus,
    proofR2Key: r.proof_r2_key,
    aiVerdict: r.ai_verdict ? JSON.parse(r.ai_verdict) as TaskVerdict : null,
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
    completedAt: r.completed_at,
    expiresAt: r.expires_at,
  }
}

export interface TaskCreate {
  id: string
  petId: string
  kind: TaskKind
  prompt: string
  verifyHint: string
  reward: Reward
  expiresAt: number
}

export async function createTask(data: TaskCreate): Promise<Task> {
  const db = getDb()
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO tasks
         (id, pet_id, kind, prompt, verify_hint, reward, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .bind(data.id, data.petId, data.kind, data.prompt, data.verifyHint, JSON.stringify(data.reward), now, data.expiresAt)
    .run()
  const t = await getTask(data.id)
  if (!t) throw new Error('createTask: row missing after insert')
  return t
}

export async function getTask(id: string): Promise<Task | null> {
  const db = getDb()
  const row = await db
    .prepare('SELECT * FROM tasks WHERE id = ? LIMIT 1')
    .bind(id)
    .first<TaskRow>()
  return row ? rowToTask(row) : null
}

/**
 * 找 pet 的"当前活跃任务"——pending 或 submitted 状态的第一个
 * 过期的直接标 expired（lazy cleanup）
 */
export async function findActiveTaskForPet(petId: string): Promise<Task | null> {
  const db = getDb()
  const row = await db
    .prepare(
      "SELECT * FROM tasks WHERE pet_id = ? AND status IN ('pending','submitted') ORDER BY created_at DESC LIMIT 1",
    )
    .bind(petId)
    .first<TaskRow>()
  if (!row) return null
  const task = rowToTask(row)
  // lazy expire
  if (task.status === 'pending' && Date.now() > task.expiresAt) {
    await db.prepare("UPDATE tasks SET status='expired' WHERE id = ?").bind(task.id).run()
    return null
  }
  return task
}

export async function countDoneTasksForPet(petId: string): Promise<number> {
  const db = getDb()
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM tasks WHERE pet_id = ? AND status = 'done'")
    .bind(petId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/**
 * 任务历史（done/rejected/expired），倒序。默认取最近 20 条。
 */
export async function listHistoryForPet(petId: string, limit = 20): Promise<Task[]> {
  const db = getDb()
  const { results } = await db
    .prepare(
      `SELECT * FROM tasks WHERE pet_id = ? AND status IN ('done','rejected','expired')
       ORDER BY COALESCE(completed_at, created_at) DESC LIMIT ?`,
    )
    .bind(petId, limit)
    .all<TaskRow>()
  return results.map(rowToTask)
}

export async function countCompletedToday(petId: string): Promise<number> {
  const db = getDb()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const row = await db
    .prepare(
      "SELECT COUNT(*) as n FROM tasks WHERE pet_id = ? AND status = 'done' AND completed_at >= ?",
    )
    .bind(petId, startOfDay.getTime())
    .first<{ n: number }>()
  return row?.n ?? 0
}

/**
 * v3.9.1: 写入用户实际提交的 kind。
 * submit API 在 verify 之前调用一次；一个 task 只该写一次（pending → submitted）。
 */
export async function setActualKind(taskId: string, kind: TaskKind): Promise<void> {
  const db = getDb()
  await db
    .prepare('UPDATE tasks SET actual_kind = ? WHERE id = ?')
    .bind(kind, taskId)
    .run()
}

/**
 * v3.8: 把指定任务标记为"被 reroll 取消"。
 * 不删行，留作审计 / 计数。
 */
export async function cancelTaskAsReroll(taskId: string): Promise<void> {
  const db = getDb()
  await db
    .prepare(
      "UPDATE tasks SET status = 'cancelled', cancelled_reason = 'reroll' WHERE id = ?",
    )
    .bind(taskId)
    .run()
}

/**
 * v3.8: 当天该 owner 的 reroll 用量。
 * JOIN pets 取 owner_id 维度（跨该 owner 的所有 pet 都计入；新放生再召唤的不重置配额）。
 */
export async function countRerollsTodayByOwner(ownerId: string): Promise<number> {
  const db = getDb()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const row = await db
    .prepare(
      `SELECT COUNT(*) as n FROM tasks t
         JOIN pets p ON t.pet_id = p.id
         WHERE p.owner_id = ?
           AND t.cancelled_reason = 'reroll'
           AND t.created_at >= ?`,
    )
    .bind(ownerId, startOfDay.getTime())
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  patch: {
    proofR2Key?: string
    aiVerdict?: TaskVerdict
    submittedAt?: number
    completedAt?: number
  } = {},
): Promise<void> {
  const db = getDb()
  const sets = ['status = ?']
  const values: unknown[] = [status]
  if (patch.proofR2Key !== undefined) { sets.push('proof_r2_key = ?'); values.push(patch.proofR2Key) }
  if (patch.aiVerdict !== undefined) { sets.push('ai_verdict = ?'); values.push(JSON.stringify(patch.aiVerdict)) }
  if (patch.submittedAt !== undefined) { sets.push('submitted_at = ?'); values.push(patch.submittedAt) }
  if (patch.completedAt !== undefined) { sets.push('completed_at = ?'); values.push(patch.completedAt) }
  values.push(id)
  await db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run()
}
