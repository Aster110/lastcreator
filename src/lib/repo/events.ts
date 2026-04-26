/**
 * v4.1 events repo（从 lib/events 抽出 SQL 部分）。
 * §8b 数据层抽象铁律：所有 SQL 仅在此文件。
 *
 * lib/events/index.ts 现在只管订阅 / 派发；持久化走本 repo。
 */
import { getDb } from '@/lib/db/client'

/** 事件持久化输入（业务用 domain 类型） */
export interface InsertEventInput {
  id: string
  type: string
  actorId: string | null
  /** payload 已是 JSON 字符串（业务层负责序列化业务 shape）*/
  payload: string
  createdAt: number
}

export async function insertEvent(e: InsertEventInput): Promise<void> {
  const db = getDb()
  await db
    .prepare('INSERT INTO events (id, type, actor_id, payload, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(e.id, e.type, e.actorId, e.payload, e.createdAt)
    .run()
}
