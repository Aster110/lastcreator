export type TaskKind = 'photo' | 'doodle'

export type TaskStatus =
  | 'pending'     // 已派发、未提交
  | 'submitted'   // 已提交、验证中
  | 'verified'    // 已验证通过（短暂中间态）
  | 'done'        // 已结算（reward 应用完）
  | 'rejected'    // 验证不通过
  | 'expired'     // 过期未完成

export interface Reward {
  /** @deprecated v3.2 起语义废弃（hp 字段被生命倒计时取代），保留为类型兼容 */
  hp?: number
  exp?: number
  mood?: string
  /** v3.2 新增：续命分钟数（主奖励通道） */
  minutes?: number
  unlockSkill?: boolean
}

export interface TaskVerdict {
  pass: boolean
  /** v3.2 新增：完成度 0-1，实际 reward = template.reward × completion */
  completion: number
  confidence?: number
  reason: string
  rawResponse?: string
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
