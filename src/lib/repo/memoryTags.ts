/**
 * v4.0 memory_tags repo。
 * §8b 数据层铁律：所有 SQL 仅在此文件；业务层只调函数。
 *
 * 写入路径：memories.addMemory 内部级联调本 repo（D1 batch 一次 commit）。
 * 读取：aggregator (lib/game/profile/) 走 listMemoryTagsByOwner 算 user preference profile。
 */
import { getDb } from '@/lib/db/client'
import type { MemoryTag, MemoryTagCreate } from '@/types/memoryTag'

interface MemoryTagRow {
  memory_id: string
  owner_id: string
  tag: string
  weight: number
  created_at: number
}

function rowToMemoryTag(r: MemoryTagRow): MemoryTag {
  return {
    memoryId: r.memory_id,
    ownerId: r.owner_id,
    tag: r.tag,
    weight: r.weight,
    createdAt: r.created_at,
  }
}

/**
 * 批量写入 memory_tags。空数组直接返回（不做 noop 调用）。
 * 调用方一般是 memories.addMemory 内部级联（同一 D1 batch）。
 *
 * 单独暴露此函数是为了支持"独立写 tags"的极端场景；
 * 主要用法仍是 addMemory 一次性级联写。
 */
export async function addMemoryTagsBatch(items: MemoryTagCreate[]): Promise<void> {
  if (items.length === 0) return
  const db = getDb()
  const stmts = items.map(item =>
    db
      .prepare(
        `INSERT OR IGNORE INTO memory_tags
           (memory_id, owner_id, tag, weight, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(item.memoryId, item.ownerId, item.tag, item.weight, item.createdAt),
  )
  await db.batch(stmts)
}

/**
 * 按 owner 查 tags（跨宠物聚合用）。
 * 默认 limit=500（防失控）；按时间倒序，aggregator 内部再聚合。
 */
export async function listMemoryTagsByOwner(
  ownerId: string,
  limit = 500,
): Promise<MemoryTag[]> {
  const db = getDb()
  const { results } = await db
    .prepare(
      'SELECT * FROM memory_tags WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .bind(ownerId, limit)
    .all<MemoryTagRow>()
  return results.map(rowToMemoryTag)
}

/** 按 memory_id 查 tags（debug / 删宠级联用）*/
export async function listMemoryTagsByMemoryId(memoryId: string): Promise<MemoryTag[]> {
  const db = getDb()
  const { results } = await db
    .prepare('SELECT * FROM memory_tags WHERE memory_id = ?')
    .bind(memoryId)
    .all<MemoryTagRow>()
  return results.map(rowToMemoryTag)
}

/** 删 tags（如果未来支持删 memory，需要级联）*/
export async function deleteMemoryTagsByMemoryId(memoryId: string): Promise<void> {
  const db = getDb()
  await db.prepare('DELETE FROM memory_tags WHERE memory_id = ?').bind(memoryId).run()
}
