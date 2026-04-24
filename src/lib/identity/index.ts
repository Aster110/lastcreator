import { cookies } from 'next/headers'
import { anonId, prefixedId } from '@/lib/db/nanoid'
import { getDb } from '@/lib/db/client'

const COOKIE_NAME = 'lc_anon'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2 // 2 年

export interface ResolvedUser {
  userId: string     // 'u_xxx'
  anonId: string     // cookie 里的 nanoid21
  isNew: boolean     // 本次是否首次创建
}

/**
 * 只读模式：从 cookie 查已有 user。**不写 cookie**，适合 Server Component。
 * 无 cookie 或 user 不存在时返回 null。
 */
export async function readUser(): Promise<ResolvedUser | null> {
  const jar = await cookies()
  const anon = jar.get(COOKIE_NAME)?.value
  if (!anon) return null
  const db = getDb()
  const existing = await db
    .prepare("SELECT id FROM users WHERE anon_ids LIKE ? LIMIT 1")
    .bind(`%"${anon}"%`)
    .first<{ id: string }>()
  if (!existing) return null
  return { userId: existing.id, anonId: anon, isNew: false }
}

/**
 * 从 Request cookie 解析身份；若无则创建匿名 user + set-cookie
 * **只能在 Route Handler / Server Action 里调用**（写 cookie）
 */
export async function resolveUser(): Promise<ResolvedUser> {
  const jar = await cookies()
  let anon = jar.get(COOKIE_NAME)?.value

  if (anon) {
    // 已有 cookie，查/建 user
    const db = getDb()
    const existing = await db
      .prepare("SELECT id FROM users WHERE anon_ids LIKE ? LIMIT 1")
      .bind(`%"${anon}"%`)
      .first<{ id: string }>()
    if (existing) {
      return { userId: existing.id, anonId: anon, isNew: false }
    }
    // cookie 指向的 user 被删除/数据库被重建 → 重新入库
    const userId = await createUser(anon)
    return { userId, anonId: anon, isNew: false }
  }

  // 无 cookie → 新匿名
  anon = anonId()
  jar.set(COOKIE_NAME, anon, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
  })
  const userId = await createUser(anon)
  return { userId, anonId: anon, isNew: true }
}

async function createUser(firstAnonId: string): Promise<string> {
  const db = getDb()
  const userId = prefixedId('u')
  const now = Date.now()
  await db
    .prepare("INSERT INTO users (id, anon_ids, created_at) VALUES (?, ?, ?)")
    .bind(userId, JSON.stringify([firstAnonId]), now)
    .run()
  return userId
}
