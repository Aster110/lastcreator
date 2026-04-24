import { getDb } from '@/lib/db/client'
import { publicUrl } from '@/lib/storage/r2'
import type { FullPet, PetState, PetStatePatch, PetStage, PetStatus } from '@/types/pet'

interface StateRow {
  pet_id: string
  name: string | null
  personality: string | null
  hp: number
  exp: number
  stage: string
  status: string
  mood: string | null
  extra: string
  updated_at: number
}

interface FullRow {
  // pets
  id: string
  owner_id: string
  image_r2_key: string
  image_origin_url: string | null
  doodle_r2_key: string | null
  memory_from_pet_id: string | null
  memory_fragment: string | null
  created_at: number
  p_name: string
  p_habitat: string
  p_personality: string
  p_skills: string
  p_hp: number
  p_story: string
  // pets_state
  s_name: string | null
  s_personality: string | null
  s_hp: number | null
  s_exp: number | null
  s_stage: string | null
  s_status: string | null
  s_mood: string | null
  s_extra: string | null
  s_updated_at: number | null
}

function rowToState(r: StateRow): PetState {
  return {
    petId: r.pet_id,
    name: r.name,
    personality: r.personality,
    hp: r.hp,
    exp: r.exp,
    stage: r.stage as PetStage,
    status: r.status as PetStatus,
    mood: r.mood,
    extra: JSON.parse(r.extra || '{}'),
    updatedAt: r.updated_at,
  }
}

function rowToFull(r: FullRow): FullPet {
  const birthSkills: string[] = JSON.parse(r.p_skills)
  const mood = r.s_mood ?? null
  const extra: Record<string, unknown> = r.s_extra ? JSON.parse(r.s_extra) : {}
  return {
    id: r.id,
    ownerId: r.owner_id,
    imageR2Key: r.image_r2_key,
    imageUrl: publicUrl(r.image_r2_key),
    imageOriginUrl: r.image_origin_url,
    doodleR2Key: r.doodle_r2_key,
    memoryFromPetId: r.memory_from_pet_id,
    memoryFragment: r.memory_fragment ? JSON.parse(r.memory_fragment) : null,
    createdAt: r.created_at,
    birthName: r.p_name,
    birthHabitat: r.p_habitat,
    birthPersonality: r.p_personality,
    birthSkills: birthSkills,
    birthHp: r.p_hp,
    birthStory: r.p_story,
    // merged
    name: r.s_name ?? r.p_name,
    personality: r.s_personality ?? r.p_personality,
    habitat: r.p_habitat,                 // v3 先不改 habitat
    skills: birthSkills,                  // v3 先不改 skills
    hp: r.s_hp ?? r.p_hp,
    exp: r.s_exp ?? 0,
    stage: (r.s_stage as PetStage) ?? '幼年',
    status: (r.s_status as PetStatus) ?? 'alive',
    story: r.p_story,
    mood,
    extra,
    updatedAt: r.s_updated_at ?? r.created_at,
  }
}

const FULL_PET_COLUMNS = `
  p.id, p.owner_id, p.image_r2_key, p.image_origin_url, p.doodle_r2_key,
  p.memory_from_pet_id, p.memory_fragment, p.created_at,
  p.name AS p_name, p.habitat AS p_habitat, p.personality AS p_personality,
  p.skills AS p_skills, p.hp AS p_hp, p.story AS p_story,
  s.name AS s_name, s.personality AS s_personality,
  s.hp AS s_hp, s.exp AS s_exp, s.stage AS s_stage, s.status AS s_status,
  s.mood AS s_mood, s.extra AS s_extra, s.updated_at AS s_updated_at
`

/** 诞生时初始化 state，和 pets 行同步创建 */
export async function initPetState(
  petId: string,
  seed: { hp: number; stage?: PetStage; status?: PetStatus },
): Promise<void> {
  const db = getDb()
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO pets_state (pet_id, hp, exp, stage, status, extra, updated_at)
       VALUES (?, ?, 0, ?, ?, '{}', ?)
       ON CONFLICT(pet_id) DO NOTHING`,
    )
    .bind(petId, seed.hp, seed.stage ?? '幼年', seed.status ?? 'alive', now)
    .run()
}

export async function getState(petId: string): Promise<PetState | null> {
  const db = getDb()
  const row = await db
    .prepare("SELECT * FROM pets_state WHERE pet_id = ? LIMIT 1")
    .bind(petId)
    .first<StateRow>()
  return row ? rowToState(row) : null
}

export async function getFullPet(petId: string): Promise<FullPet | null> {
  const db = getDb()
  const row = await db
    .prepare(
      `SELECT ${FULL_PET_COLUMNS} FROM pets p LEFT JOIN pets_state s ON p.id = s.pet_id
       WHERE p.id = ? LIMIT 1`,
    )
    .bind(petId)
    .first<FullRow>()
  return row ? rowToFull(row) : null
}

export async function listFullPetsByOwner(
  ownerId: string,
  opts: { limit?: number } = {},
): Promise<FullPet[]> {
  const db = getDb()
  const { limit = 100 } = opts
  const { results } = await db
    .prepare(
      `SELECT ${FULL_PET_COLUMNS} FROM pets p LEFT JOIN pets_state s ON p.id = s.pet_id
       WHERE p.owner_id = ? ORDER BY p.created_at DESC LIMIT ?`,
    )
    .bind(ownerId, limit)
    .all<FullRow>()
  return results.map(rowToFull)
}

/** diff-aware 写入 state */
export async function patchPetState(petId: string, patch: PetStatePatch): Promise<PetState> {
  const db = getDb()
  const now = Date.now()
  const sets: string[] = []
  const values: unknown[] = []
  if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name) }
  if (patch.personality !== undefined) { sets.push('personality = ?'); values.push(patch.personality) }
  if (patch.hp !== undefined) { sets.push('hp = ?'); values.push(patch.hp) }
  if (patch.exp !== undefined) { sets.push('exp = ?'); values.push(patch.exp) }
  if (patch.stage !== undefined) { sets.push('stage = ?'); values.push(patch.stage) }
  if (patch.status !== undefined) { sets.push('status = ?'); values.push(patch.status) }
  if (patch.mood !== undefined) { sets.push('mood = ?'); values.push(patch.mood) }
  if (patch.extra !== undefined) { sets.push('extra = ?'); values.push(JSON.stringify(patch.extra)) }
  sets.push('updated_at = ?')
  values.push(now, petId)

  await db
    .prepare(`UPDATE pets_state SET ${sets.join(', ')} WHERE pet_id = ?`)
    .bind(...values)
    .run()
  const out = await getState(petId)
  if (!out) throw new Error(`petState.patch: state missing after update (pet_id=${petId})`)
  return out
}
