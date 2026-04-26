import { getDb } from '@/lib/db/client'
import { publicUrl } from '@/lib/storage/r2'
import type { ElementId, Pet, PetCreate } from '@/types/pet'

interface PetRow {
  id: string
  owner_id: string
  name: string
  habitat: string
  personality: string
  skills: string
  hp: number
  exp: number
  story: string
  image_r2_key: string
  image_origin_url: string | null
  doodle_r2_key: string | null
  stage: string
  status: string
  element: string | null
  created_at: number
  updated_at: number
}

function rowToPet(r: PetRow): Pet {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    habitat: r.habitat,
    personality: r.personality,
    skills: JSON.parse(r.skills),
    hp: r.hp,
    exp: r.exp,
    story: r.story,
    imageR2Key: r.image_r2_key,
    imageUrl: publicUrl(r.image_r2_key),
    imageOriginUrl: r.image_origin_url,
    doodleR2Key: r.doodle_r2_key,
    stage: r.stage as Pet['stage'],
    status: r.status as Pet['status'],
    element: (r.element as ElementId | null) ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function createPet(data: PetCreate): Promise<Pet> {
  const db = getDb()
  const now = data.createdAt ?? Date.now()
  const status = data.status ?? 'alive'
  const aliveOwnerId = status === 'alive' ? data.ownerId : null
  await db
    .prepare(
      `INSERT INTO pets (
        id, owner_id, name, habitat, personality, skills, hp, exp, story,
        image_r2_key, image_origin_url, doodle_r2_key, stage, status,
        element, alive_owner_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.ownerId,
      data.name,
      data.habitat,
      data.personality,
      JSON.stringify(data.skills),
      data.hp,
      data.exp ?? 0,
      data.story,
      data.imageR2Key,
      data.imageOriginUrl ?? null,
      data.doodleR2Key ?? null,
      data.stage ?? '幼年',
      status,
      data.element ?? null,
      aliveOwnerId,
      now,
      now,
    )
    .run()
  const fetched = await getPet(data.id)
  if (!fetched) throw new Error('pets.create: insert succeeded but fetch failed')
  return fetched
}

export async function getPet(id: string): Promise<Pet | null> {
  const db = getDb()
  const row = await db
    .prepare("SELECT * FROM pets WHERE id = ? LIMIT 1")
    .bind(id)
    .first<PetRow>()
  return row ? rowToPet(row) : null
}

export async function listPetsByOwner(
  ownerId: string,
  opts: { limit?: number; status?: Pet['status'] } = {},
): Promise<Pet[]> {
  const db = getDb()
  const { limit = 100, status } = opts
  const query = status
    ? db.prepare(
        "SELECT * FROM pets WHERE owner_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?",
      ).bind(ownerId, status, limit)
    : db.prepare(
        "SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?",
      ).bind(ownerId, limit)
  const { results } = await query.all<PetRow>()
  return results.map(rowToPet)
}

export async function countAlivePets(): Promise<number> {
  const db = getDb()
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM pets WHERE status = 'alive'")
    .first<{ n: number }>()
  return row?.n ?? 0
}

/**
 * v3.5: 单宠约束支撑。基于 alive_owner_id 索引，O(1) 查询。
 * 注意：读的是 pets.alive_owner_id（由 createPet / patchPetState / markDead / release 维护）。
 * DB 层 UNIQUE INDEX 是兜底，这个函数用于业务层快速失败（UX 优化）。
 */
export async function countAliveByOwner(ownerId: string): Promise<number> {
  const db = getDb()
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM pets WHERE alive_owner_id = ?")
    .bind(ownerId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/**
 * v3.5: 清除指定宠物的 alive_owner_id（转为 NULL）。
 * 用于 status 从 alive → released/dead 时释放"单宠槽位"。
 * 由 patchPetState 和 markDead 内部调用（业务代码不直接调）。
 */
export async function clearAliveOwner(petId: string): Promise<void> {
  const db = getDb()
  await db
    .prepare("UPDATE pets SET alive_owner_id = NULL WHERE id = ?")
    .bind(petId)
    .run()
}

export async function earliestPetCreatedAt(): Promise<number | null> {
  const db = getDb()
  const row = await db
    .prepare("SELECT MIN(created_at) as t FROM pets")
    .first<{ t: number | null }>()
  return row?.t ?? null
}

export async function sumAliveHp(): Promise<number> {
  const db = getDb()
  const row = await db
    .prepare("SELECT COALESCE(SUM(hp), 0) as s FROM pets WHERE status = 'alive'")
    .first<{ s: number }>()
  return row?.s ?? 0
}
