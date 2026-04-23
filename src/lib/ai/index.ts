import type { PetAttributes } from '@/types/pet'

export interface PetGenerator {
  generate(input: {
    imageUrl: string
    /** 继承的记忆片段（v3） */
    memoryHint?: string
  }): Promise<PetAttributes>
}

export { openRouterGenerator } from './openrouter'
export { mockGenerator } from './mock'
