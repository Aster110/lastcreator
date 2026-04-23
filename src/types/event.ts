import type { PetStage } from './pet'

export type DomainEvent =
  | { type: 'pet.born'; petId: string; ownerId: string; at: number }
  | { type: 'pet.leveled'; petId: string; from: PetStage; to: PetStage; at: number }
  | { type: 'pet.released'; petId: string; at: number }
  | { type: 'pet.died'; petId: string; at: number }
  | { type: 'task.completed'; taskId: string; petId: string; at: number }
  | { type: 'share.viewed'; petId: string; viewer?: string; at: number }

export type EventType = DomainEvent['type']
export type EventOfType<T extends EventType> = Extract<DomainEvent, { type: T }>
