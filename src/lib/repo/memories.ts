/**
 * memories repo。
 * §8b 数据层抽象铁律：所有 SQL 仅在此文件；业务层只调函数，不见 prepare/bind。
 *
 * 演进：
 *   v3.9.2: 初版 memories 表 + payload JSON
 *   v4.0:   addMemory 内部级联写 memory_tags（D1 batch 原子）
 *   v4.1.B: payload JSON 按 kind 拆列 → expand 阶段（仍写老 payload 兼容）
 */
import { getDb } from '@/lib/db/client'
import { prefixedId } from '@/lib/db/nanoid'
import type {
  MemoryRecord,
  MemoryCreate,
  MemoryKind,
  MemoryPayload,
  MemorySource,
} from '@/types/memory'

interface MemoryRow {
  id: string
  pet_id: string
  owner_id: string
  kind: string
  source: string | null
  source_ref: string | null
  /** v4.1.B: legacy JSON，业务读优先用拆出的列 */
  payload: string
  created_at: number
  // v4.1.B 新列
  preference_task_id: string | null
  inheritance_from_pet_id: string | null
  inheritance_fragment_text: string | null
  event_name: string | null
  event_meta: string | null
  narrative_title: string | null
  narrative_body: string | null
  narrative_model_id: string | null
  narrative_cause: string | null
}

/**
 * preference 类的 tags + confidence 在 memory_tags 表（0009 拆出）；
 * 这里组装时不直接读 memory_tags（会引入跨表 join 复杂性）——
 * 走 fallback 方案：尝试从老 payload JSON 拿 tags + confidence；
 * 新数据如果 payload 已被 contract DROP，则空数组（v4.x 后真正闭环用 listMemoryTagsByMemoryId 即可）。
 *
 * 单独导出便于单测。
 */
export function rowToPayload(
  r: Pick<
    MemoryRow,
    | 'kind'
    | 'payload'
    | 'preference_task_id'
    | 'inheritance_from_pet_id'
    | 'inheritance_fragment_text'
    | 'event_name'
    | 'event_meta'
    | 'narrative_title'
    | 'narrative_body'
    | 'narrative_model_id'
    | 'narrative_cause'
  >,
): MemoryPayload {
  const kind = r.kind as MemoryKind

  if (kind === 'inheritance') {
    if (r.inheritance_from_pet_id !== null || r.inheritance_fragment_text !== null) {
      return {
        kind: 'inheritance',
        fromPetId: r.inheritance_from_pet_id ?? '',
        fragmentText: r.inheritance_fragment_text ?? '',
      }
    }
  }

  if (kind === 'event') {
    if (r.event_name !== null) {
      const parsed = r.event_meta ? safeParse<Record<string, unknown>>(r.event_meta) : null
      return {
        kind: 'event',
        event: r.event_name as 'born' | 'died' | 'released' | 'task_passed',
        meta: parsed ?? undefined,
      }
    }
  }

  if (kind === 'narrative') {
    if (r.narrative_title !== null || r.narrative_body !== null) {
      return {
        kind: 'narrative',
        title: r.narrative_title ?? '',
        body: r.narrative_body ?? '',
        modelId: r.narrative_model_id ?? '',
        cause: (r.narrative_cause ?? 'died') as 'died' | 'released',
      }
    }
  }

  if (kind === 'preference') {
    // tags 在 memory_tags 表；这里 fallback 老 payload JSON 取 tags + confidence
    // 新数据老 payload 也仍写（v4.1 expand 期），所以这里能拿到
    const fromJson = r.payload ? safeParse<MemoryPayload>(r.payload) : null
    if (fromJson && fromJson.kind === 'preference') {
      return {
        kind: 'preference',
        tags: fromJson.tags,
        confidence: fromJson.confidence,
        taskId: r.preference_task_id ?? fromJson.taskId,
      }
    }
    // 兜底：tags 必须从 memory_tags 反查（v4.x contract 后启用），暂返空
    return {
      kind: 'preference',
      tags: [],
      confidence: 1.0,
      taskId: r.preference_task_id ?? undefined,
    }
  }

  // 兜底：老数据未迁移（不应触发，但安全网）
  if (r.payload) {
    const parsed = safeParse<MemoryPayload>(r.payload)
    if (parsed) return parsed
  }
  // 极端兜底：无数据；构造对应 kind 的空 shape
  return defaultPayload(kind)
}

function safeParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function defaultPayload(kind: MemoryKind): MemoryPayload {
  switch (kind) {
    case 'preference':
      return { kind: 'preference', tags: [], confidence: 1.0 }
    case 'inheritance':
      return { kind: 'inheritance', fromPetId: '', fragmentText: '' }
    case 'event':
      return { kind: 'event', event: 'born' }
    case 'narrative':
      return { kind: 'narrative', title: '', body: '', modelId: '', cause: 'died' }
  }
}

function rowToMemory(r: MemoryRow): MemoryRecord {
  return {
    id: r.id,
    petId: r.pet_id,
    ownerId: r.owner_id,
    kind: r.kind as MemoryKind,
    source: (r.source ?? null) as MemorySource,
    sourceRef: r.source_ref,
    payload: rowToPayload(r),
    createdAt: r.created_at,
  }
}

/**
 * 写入一条 memory，返回带 id 的完整 record。
 *
 * v4.0:   preference + 非空 tags → 同一 D1 batch 内级联写 memory_tags
 * v4.1.B: 同一 batch 内同时写新列（按 kind 落字段）+ 老 payload JSON（兼容期）
 */
export async function addMemory(input: MemoryCreate): Promise<MemoryRecord> {
  const db = getDb()
  const id = prefixedId('m')
  const now = Date.now()

  // 按 kind 拆列
  const cols = splitPayloadIntoColumns(input.payload)

  const memoryStmt = db
    .prepare(
      `INSERT INTO memories
         (id, pet_id, owner_id, kind, source, source_ref, payload, created_at,
          preference_task_id,
          inheritance_from_pet_id, inheritance_fragment_text,
          event_name, event_meta,
          narrative_title, narrative_body, narrative_model_id, narrative_cause)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.petId,
      input.ownerId,
      input.kind,
      input.source ?? null,
      input.sourceRef ?? null,
      JSON.stringify(input.payload),
      now,
      cols.preference_task_id,
      cols.inheritance_from_pet_id,
      cols.inheritance_fragment_text,
      cols.event_name,
      cols.event_meta,
      cols.narrative_title,
      cols.narrative_body,
      cols.narrative_model_id,
      cols.narrative_cause,
    )

  const tagStmts =
    input.kind === 'preference' && input.payload.kind === 'preference'
      ? input.payload.tags.map(tag =>
          db
            .prepare(
              `INSERT OR IGNORE INTO memory_tags
                 (memory_id, owner_id, tag, weight, created_at)
               VALUES (?, ?, ?, ?, ?)`,
            )
            .bind(
              id,
              input.ownerId,
              tag,
              input.payload.kind === 'preference' ? input.payload.confidence : 1.0,
              now,
            ),
        )
      : []

  await db.batch([memoryStmt, ...tagStmts])

  return {
    id,
    petId: input.petId,
    ownerId: input.ownerId,
    kind: input.kind,
    source: input.source ?? null,
    sourceRef: input.sourceRef ?? null,
    payload: input.payload,
    createdAt: now,
  }
}

/**
 * 从 MemoryPayload 拆出对应列的值（其余 kind 列为 null）。
 * 单独导出便于单测。
 */
export function splitPayloadIntoColumns(p: MemoryPayload): {
  preference_task_id: string | null
  inheritance_from_pet_id: string | null
  inheritance_fragment_text: string | null
  event_name: string | null
  event_meta: string | null
  narrative_title: string | null
  narrative_body: string | null
  narrative_model_id: string | null
  narrative_cause: string | null
} {
  const empty = {
    preference_task_id: null,
    inheritance_from_pet_id: null,
    inheritance_fragment_text: null,
    event_name: null,
    event_meta: null,
    narrative_title: null,
    narrative_body: null,
    narrative_model_id: null,
    narrative_cause: null,
  }
  switch (p.kind) {
    case 'preference':
      return { ...empty, preference_task_id: p.taskId ?? null }
    case 'inheritance':
      return {
        ...empty,
        inheritance_from_pet_id: p.fromPetId,
        inheritance_fragment_text: p.fragmentText,
      }
    case 'event':
      return {
        ...empty,
        event_name: p.event,
        event_meta: p.meta ? JSON.stringify(p.meta) : null,
      }
    case 'narrative':
      return {
        ...empty,
        narrative_title: p.title,
        narrative_body: p.body,
        narrative_model_id: p.modelId,
        narrative_cause: p.cause,
      }
  }
}

/** 按 pet 查所有记忆，按时间倒序 */
export async function listByPet(petId: string, limit = 100): Promise<MemoryRecord[]> {
  const db = getDb()
  const { results } = await db
    .prepare(
      'SELECT * FROM memories WHERE pet_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .bind(petId, limit)
    .all<MemoryRow>()
  return results.map(rowToMemory)
}

/** 按 owner + kind 查，跨宠物聚合（v2 学习闭环用）*/
export async function listByOwnerAndKind(
  ownerId: string,
  kind: MemoryKind,
  limit = 200,
): Promise<MemoryRecord[]> {
  const db = getDb()
  const { results } = await db
    .prepare(
      'SELECT * FROM memories WHERE owner_id = ? AND kind = ? ORDER BY created_at DESC LIMIT ?',
    )
    .bind(ownerId, kind, limit)
    .all<MemoryRow>()
  return results.map(rowToMemory)
}

/** 取单条（外部一般不用，复 testing 用）*/
export async function getMemoryById(id: string): Promise<MemoryRecord | null> {
  const db = getDb()
  const row = await db
    .prepare('SELECT * FROM memories WHERE id = ? LIMIT 1')
    .bind(id)
    .first<MemoryRow>()
  return row ? rowToMemory(row) : null
}
