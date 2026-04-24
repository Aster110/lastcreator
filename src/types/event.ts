import type { PetStage, PetStatePatch } from './pet'
import type { Reward, TaskKind } from './task'

export type DomainEvent =
  | { type: 'pet.born'; petId: string; ownerId: string; at: number }
  | { type: 'pet.leveled'; petId: string; from: PetStage; to: PetStage; at: number }
  | { type: 'pet.released'; petId: string; at: number }
  | { type: 'pet.died'; petId: string; causedBy: 'expired' | 'manual'; at: number }
  | { type: 'task.assigned'; taskId: string; petId: string; kind: TaskKind; at: number }
  | { type: 'task.submitted'; taskId: string; petId: string; proofR2Key: string; at: number }
  | { type: 'task.completed'; taskId: string; petId: string; reward: Reward; completion: number; lifeExtendedMs: number; at: number }
  | { type: 'task.rejected'; taskId: string; petId: string; reason: string; at: number }
  | { type: 'state.changed'; petId: string; delta: PetStatePatch; at: number }
  | { type: 'share.viewed'; petId: string; viewer?: string; at: number }

export type EventType = DomainEvent['type']
export type EventOfType<T extends EventType> = Extract<DomainEvent, { type: T }>
