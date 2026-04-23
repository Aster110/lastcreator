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
