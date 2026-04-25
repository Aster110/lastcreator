/**
 * v3.9.2 记忆系统类型。
 * v1 范围：数据收集 only（preference 类作主线，event/narrative 配套）
 * v2 范围：aggregator + inheritance（学习闭环），shape 不变
 */

export type MemoryKind = 'preference' | 'inheritance' | 'event' | 'narrative'
export type MemorySource = 'task' | 'death' | 'manual' | null

/** 不同 kind 的 payload shape（应用层约束，DB 用 JSON 字符串存） */
export type MemoryPayload =
  | { kind: 'preference'; tags: string[]; confidence: number; taskId?: string }
  | { kind: 'inheritance'; fromPetId: string; fragmentText: string }
  | {
      kind: 'event'
      event: 'born' | 'died' | 'released' | 'task_passed'
      meta?: Record<string, unknown>
    }
  | {
      kind: 'narrative'
      title: string
      body: string
      modelId: string
      cause: 'died' | 'released'
    }

export interface MemoryRecord {
  id: string
  petId: string
  ownerId: string
  kind: MemoryKind
  source?: MemorySource
  sourceRef?: string | null
  payload: MemoryPayload
  createdAt: number
}

export interface MemoryCreate {
  petId: string
  ownerId: string
  kind: MemoryKind
  source?: MemorySource
  sourceRef?: string | null
  payload: MemoryPayload
}
