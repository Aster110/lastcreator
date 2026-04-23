import { getDb } from '@/lib/db/client'
import { publicUrl } from '@/lib/storage/r2'
import type { Pet, PetCreate } from '@/types/pet'

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
  memory_from_pet_id: string | null
  memory_fragment: string | null
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
    memoryFromPetId: r.memory_from_pet_id,
    memoryFragment: r.memory_fragment ? JSON.parse(r.memory_fragment) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function createPet(data: PetCreate): Promise<Pet> {
  const db = getDb()
  const now = data.createdAt ?? Date.now()
  await db
    .prepare(
      `INSERT INTO pets (
        id, owner_id, name, habitat, personality, skills, hp, exp, story,
        image_r2_key, image_origin_url, doodle_r2_key, stage, status,
        memory_from_pet_id, memory_fragment, created_at, updated_at
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
      data.status ?? 'alive',
      data.memoryFromPetId ?? null,
      data.memoryFragment ? JSON.stringify(data.memoryFragment) : null,
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

export async function earliestPetCreatedAt(): Promise<number | null> {
  const db = getDb()
  const row = await db
    .prepare("SELECT MIN(created_at) as t FROM pets")
    .first<{ t: number | null }>()
  return row?.t ?? null
}
