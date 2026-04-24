export type PetStage = '幼年' | '青年' | '成年' | '老年'
export type PetStatus = 'alive' | 'released' | 'dead'

export interface PetAttributes {
  name: string
  habitat: string
  personality: string
  skills: string[]
  hp: number
  story: string
}

export interface Pet extends PetAttributes {
  id: string
  ownerId: string
  imageUrl: string                 // R2 public URL
  imageR2Key: string
  imageOriginUrl?: string | null
  doodleR2Key?: string | null
  exp: number
  stage: PetStage
  status: PetStatus
  memoryFromPetId?: string | null
  memoryFragment?: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

export type PetCreate = Omit<Pet, 'createdAt' | 'updatedAt'> & {
  createdAt?: number
  updatedAt?: number
}

/** PetCard / 前端展示视图。API 可返回子集（fallback 时无 image） */
export type DisplayPet = {
  id: string
  name: string
  habitat: string
  personality: string
  skills: string[]
  hp: number
  story: string
  imageUrl?: string | null
  stage?: PetStage
  createdAt?: number
}

// ========== v3：状态解耦 ==========

/** pets_state 行的纯字段（可变状态） */
export interface PetState {
  petId: string
  name: string | null          // null = 用 pets.name
  personality: string | null
  hp: number
  exp: number
  stage: PetStage
  status: PetStatus
  mood?: string | null
  extra: Record<string, unknown>
  updatedAt: number
}

/** state 的可变 patch（写入前的 diff） */
export type PetStatePatch = Partial<
  Pick<PetState, 'name' | 'personality' | 'hp' | 'exp' | 'stage' | 'status' | 'mood' | 'extra'>
>

/** FullPet = birth（pets）+ state（pets_state），state 覆盖同名字段 */
export interface FullPet {
  // birth
  id: string
  ownerId: string
  imageR2Key: string
  imageUrl: string
  imageOriginUrl?: string | null
  doodleR2Key?: string | null
  memoryFromPetId?: string | null
  memoryFragment?: Record<string, unknown> | null
  createdAt: number
  birthName: string
  birthHabitat: string
  birthPersonality: string
  birthSkills: string[]
  birthHp: number
  birthStory: string
  // merged (current)
  name: string
  personality: string
  habitat: string
  skills: string[]
  hp: number
  exp: number
  stage: PetStage
  status: PetStatus
  story: string                // = birthStory（v3 不可改）
  mood?: string | null
  extra: Record<string, unknown>
  updatedAt: number
}
