export type PetStage = '幼年' | '青年' | '成年' | '老年'
export type PetStatus = 'alive' | 'released' | 'dead'
export type ElementId = 'ruins' | 'fire' | 'water' | 'dark' | 'ice' | 'sky'

export interface PetAttributes {
  name: string
  habitat: string
  personality: string
  skills: string[]
  /** @deprecated v3.2：HP 语义被生命倒计时取代；保留字段做兼容 */
  hp: number
  story: string
  /** v3.2 新增：AI 根据人格/气质给的"天赋寿命加成"，分钟，0-120 */
  lifeBonusMinutes?: number
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
  /** v3.3：诞生时分配的元素属性（null = 老数据未分配） */
  element?: ElementId | null
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
  /** @deprecated v3.2：HP 语义被生命倒计时取代 */
  hp: number
  story: string
  imageUrl?: string | null
  stage?: PetStage
  status?: PetStatus
  createdAt?: number
  /** v3.2 新增 */
  lifeExpiresAt?: number | null
  /** v3.2 新增：完成任务数（SSR 预取） */
  completedTaskCount?: number
  /** v3.3 新增：元素属性 */
  element?: ElementId | null
}

// ========== v3：状态解耦 ==========

/** pets_state 行的纯字段（可变状态） */
export interface PetState {
  petId: string
  name: string | null          // null = 用 pets.name
  personality: string | null
  /** @deprecated v3.2 废弃语义（由 lifeExpiresAt 取代），保留字段做兼容 */
  hp: number
  exp: number
  stage: PetStage
  status: PetStatus
  mood?: string | null
  extra: Record<string, unknown>
  /** v3.2 新增：生命倒计时终点 UNIX ms；null = 未初始化或已释放/死亡不适用 */
  lifeExpiresAt: number | null
  updatedAt: number
}

/** state 的可变 patch（写入前的 diff） */
export type PetStatePatch = Partial<
  Pick<PetState, 'name' | 'personality' | 'hp' | 'exp' | 'stage' | 'status' | 'mood' | 'extra' | 'lifeExpiresAt'>
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
  /** v3.3：诞生时分配的元素属性 */
  element?: ElementId | null
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
  /** @deprecated v3.2 废弃 */
  hp: number
  exp: number
  stage: PetStage
  status: PetStatus
  story: string                // = birthStory（v3 不可改）
  mood?: string | null
  extra: Record<string, unknown>
  /** v3.2 新增：生命倒计时终点 ms，null = 未初始化（老数据兜底）或已非 alive */
  lifeExpiresAt: number | null
  updatedAt: number
}
