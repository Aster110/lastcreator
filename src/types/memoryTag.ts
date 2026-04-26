/**
 * v4.0 记忆 tag 独立表类型。
 * 从 memories.payload.tags（JSON）展开到关系表，治 SQLite JSON 查询性能差。
 *
 * compound PK (memoryId, tag) 在表层；这里给业务用的 domain shape 就是平铺。
 */
export interface MemoryTag {
  memoryId: string
  ownerId: string
  tag: string
  weight: number
  createdAt: number
}

/** addMemoryTagsBatch 入参 */
export type MemoryTagCreate = Omit<MemoryTag, never>
