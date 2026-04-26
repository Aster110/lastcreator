import { getDb } from '@/lib/db/client'
import { publicUrl } from '@/lib/storage/r2'
import { shouldMarkDead, emitPetDied } from '@/lib/game/lifecycle'
import { clearAliveOwner } from '@/lib/repo/pets'
import type { ElementId, FullPet, PetState, PetStatePatch, PetStage, PetStatus } from '@/types/pet'

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
  life_expires_at: number | null
  updated_at: number
}

interface FullRow {
  // pets
  id: string
  owner_id: string
  image_r2_key: string
  image_origin_url: string | null
  doodle_r2_key: string | null
  created_at: number
  p_name: string
  p_habitat: string
  p_personality: string
  p_skills: string
  p_hp: number
  p_story: string
  p_element: string | null
  // pets_state
  s_name: string | null
  s_personality: string | null
  s_hp: number | null
  s_exp: number | null
  s_stage: string | null
  s_status: string | null
  s_mood: string | null
  s_extra: string | null
  s_life_expires_at: number | null
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
    lifeExpiresAt: r.life_expires_at,
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
    element: (r.p_element as ElementId | null) ?? null,
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
    habitat: r.p_habitat,
    skills: birthSkills,
    hp: r.s_hp ?? r.p_hp,
    exp: r.s_exp ?? 0,
    stage: (r.s_stage as PetStage) ?? '幼年',
    status: (r.s_status as PetStatus) ?? 'alive',
    story: r.p_story,
    mood,
    extra,
    lifeExpiresAt: r.s_life_expires_at,
    updatedAt: r.s_updated_at ?? r.created_at,
  }
}

const FULL_PET_COLUMNS = `
  p.id, p.owner_id, p.image_r2_key, p.image_origin_url, p.doodle_r2_key,
  p.created_at,
  p.name AS p_name, p.habitat AS p_habitat, p.personality AS p_personality,
  p.skills AS p_skills, p.hp AS p_hp, p.story AS p_story, p.element AS p_element,
  s.name AS s_name, s.personality AS s_personality,
  s.hp AS s_hp, s.exp AS s_exp, s.stage AS s_stage, s.status AS s_status,
  s.mood AS s_mood, s.extra AS s_extra,
  s.life_expires_at AS s_life_expires_at,
  s.updated_at AS s_updated_at
`

/** 内部：直接把某宠物标 dead（绕过 patchPetState 避免嵌套） */
async function markDead(petId: string): Promise<number> {
  const db = getDb()
  const now = Date.now()
  await db
    .prepare("UPDATE pets_state SET status='dead', updated_at=? WHERE pet_id=? AND status='alive'")
    .bind(now, petId)
    .run()
  // v3.5: 单宠约束——释放槽位
  await clearAliveOwner(petId)
  emitPetDied(petId)
  return now
}

/** 诞生时初始化 state，和 pets 行同步创建 */
export async function initPetState(
  petId: string,
  seed: { hp: number; stage?: PetStage; status?: PetStatus; lifeExpiresAt?: number | null },
): Promise<void> {
  const db = getDb()
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO pets_state (pet_id, hp, exp, stage, status, extra, life_expires_at, updated_at)
       VALUES (?, ?, 0, ?, ?, '{}', ?, ?)
       ON CONFLICT(pet_id) DO NOTHING`,
    )
    .bind(petId, seed.hp, seed.stage ?? '幼年', seed.status ?? 'alive', seed.lifeExpiresAt ?? null, now)
    .run()
}

export async function getState(petId: string): Promise<PetState | null> {
  const db = getDb()
  const row = await db
    .prepare("SELECT * FROM pets_state WHERE pet_id = ? LIMIT 1")
    .bind(petId)
    .first<StateRow>()
  if (!row) return null
  const state = rowToState(row)
  if (shouldMarkDead(state)) {
    const now = await markDead(petId)
    return { ...state, status: 'dead', updatedAt: now }
  }
  return state
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
  if (!row) return null
  const full = rowToFull(row)
  if (shouldMarkDead(full)) {
    const now = await markDead(petId)
    return { ...full, status: 'dead', updatedAt: now }
  }
  return full
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
  const pets = results.map(rowToFull)
  const now = Date.now()
  // 批量懒检查：过期的 alive → dead
  for (const p of pets) {
    if (shouldMarkDead(p, now)) {
      await markDead(p.id)
      p.status = 'dead'
      p.updatedAt = now
    }
  }
  return pets
}

/** 全服图鉴：按创建时间倒序列出所有宠物（不限 owner） */
export async function listAllFullPets(
  opts: { limit?: number } = {},
): Promise<FullPet[]> {
  const db = getDb()
  const { limit = 200 } = opts
  const { results } = await db
    .prepare(
      `SELECT ${FULL_PET_COLUMNS} FROM pets p LEFT JOIN pets_state s ON p.id = s.pet_id
       ORDER BY p.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<FullRow>()
  const pets = results.map(rowToFull)
  const now = Date.now()
  for (const p of pets) {
    if (shouldMarkDead(p, now)) {
      await markDead(p.id)
      p.status = 'dead'
      p.updatedAt = now
    }
  }
  return pets
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
  if (patch.lifeExpiresAt !== undefined) { sets.push('life_expires_at = ?'); values.push(patch.lifeExpiresAt) }
  sets.push('updated_at = ?')
  values.push(now, petId)

  await db
    .prepare(`UPDATE pets_state SET ${sets.join(', ')} WHERE pet_id = ?`)
    .bind(...values)
    .run()
  // v3.5: 单宠约束——status 离开 alive 时释放槽位（死不能复活，无需处理进 alive 方向）
  if (patch.status !== undefined && patch.status !== 'alive') {
    await clearAliveOwner(petId)
  }
  // 避免重入懒检查
  const row = await db
    .prepare("SELECT * FROM pets_state WHERE pet_id = ? LIMIT 1")
    .bind(petId)
    .first<StateRow>()
  if (!row) throw new Error(`petState.patch: state missing after update (pet_id=${petId})`)
  return rowToState(row)
}
