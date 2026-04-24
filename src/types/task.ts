export type TaskKind = 'photo' | 'doodle'

export type TaskStatus =
  | 'pending'     // 已派发、未提交
  | 'submitted'   // 已提交、验证中
  | 'verified'    // 已验证通过（短暂中间态）
  | 'done'        // 已结算（reward 应用完）
  | 'rejected'    // 验证不通过
  | 'expired'     // 过期未完成

export interface Reward {
  hp?: number
  exp?: number
  mood?: string
  unlockSkill?: boolean      // v4
}

export interface TaskVerdict {
  pass: boolean
  confidence?: number        // 0-1
  reason: string
  rawResponse?: string       // v4 Claude 原始响应
}

export interface Task {
  id: string
  petId: string
  kind: TaskKind
  prompt: string
  verifyHint: string
  reward: Reward
  status: TaskStatus
  proofR2Key?: string | null
  aiVerdict?: TaskVerdict | null
  createdAt: number
  submittedAt?: number | null
  completedAt?: number | null
  expiresAt: number
}

export type DisplayTask = Pick<
  Task,
  'id' | 'kind' | 'prompt' | 'reward' | 'status' | 'expiresAt' | 'proofR2Key' | 'aiVerdict'
>

export interface TaskProof {
  kind: TaskKind
  r2Key: string
  imageUrl: string
}
