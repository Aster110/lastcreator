/**
 * v4.1 users repo（从 lib/identity 抽出）。
 * §8b 数据层抽象铁律：所有 SQL 仅在此文件。
 *
 * lib/identity 现在只管 cookie + 业务流程；DB 访问统一走本 repo。
 */
import { getDb } from '@/lib/db/client'

/** 通过 anon cookie id 查 user_id */
export async function findUserIdByAnonId(anonId: string): Promise<string | null> {
  const db = getDb()
  const row = await db
    .prepare("SELECT id FROM users WHERE anon_ids LIKE ? LIMIT 1")
    .bind(`%"${anonId}"%`)
    .first<{ id: string }>()
  return row?.id ?? null
}

/** 写入新 user（第一次匿名时） */
export async function insertUser(
  userId: string,
  firstAnonId: string,
  createdAt: number,
): Promise<void> {
  const db = getDb()
  await db
    .prepare("INSERT INTO users (id, anon_ids, created_at) VALUES (?, ?, ?)")
    .bind(userId, JSON.stringify([firstAnonId]), createdAt)
    .run()
}
