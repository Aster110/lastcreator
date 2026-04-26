/**
 * v3.9.2 memories repo。v4.0 加 memory_tags 级联写（D1 batch 原子提交）。
 * §8b 数据层铁律：所有 SQL 仅在此文件；业务层只调函数，不见 prepare/bind。
 *
 * v1 暴露：addMemory / listByPet / listByOwnerAndKind / getById
 * v4.0 改动：addMemory 内部级联 memory_tags（不改签名）；preference 写入时 tags 同步落表
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
  payload: string
  created_at: number
}

function rowToMemory(r: MemoryRow): MemoryRecord {
  return {
    id: r.id,
    petId: r.pet_id,
    ownerId: r.owner_id,
    kind: r.kind as MemoryKind,
    source: (r.source ?? null) as MemorySource,
    sourceRef: r.source_ref,
    payload: JSON.parse(r.payload) as MemoryPayload,
    createdAt: r.created_at,
  }
}

/**
 * 写入一条 memory，返回带 id 的完整 record。
 *
 * v4.0：preference + 非空 tags → 同一 D1 batch 内级联写 memory_tags（原子提交）。
 * D1 batch 任一语句失败整体回滚——保证 memories 与 memory_tags 不分裂。
 */
export async function addMemory(input: MemoryCreate): Promise<MemoryRecord> {
  const db = getDb()
  const id = prefixedId('m')
  const now = Date.now()

  const memoryStmt = db
    .prepare(
      `INSERT INTO memories
         (id, pet_id, owner_id, kind, source, source_ref, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
