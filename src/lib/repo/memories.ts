/**
 * v3.9.2 memories repo。
 * §8 数据层铁律：所有 SQL 仅在此文件；业务层只调函数，不见 prepare/bind。
 *
 * v1 暴露：addMemory / listByPet / listByOwnerAndKind / getById
 * v2 计划：addBatch / aggregateByOwner（学习用）
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

/** 写入一条 memory，返回带 id 的完整 record */
export async function addMemory(input: MemoryCreate): Promise<MemoryRecord> {
  const db = getDb()
  // 'm_' 跟其他实体（u_/p_/t_）prefix 一致；IdPrefix 'm' 占位于 nanoid.ts
  const id = prefixedId('m')
  const now = Date.now()
  await db
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
    .run()
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
