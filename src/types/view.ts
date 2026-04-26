import type { PetStage, PetStatus } from './pet'
import type { TaskKind, Reward, TaskStatus, TaskVerdict } from './task'

/**
 * PetView — UI 层专用视图模型
 *
 * 前端组件只认这个类型，不再吃 FullPet / DisplayPet / Pet。
 * 加字段只改 adapter（`lib/view/petView.ts`），组件不动。
 */
export interface PetView {
  id: string
  name: string
  habitat: string
  personality: string
  skills: string[]
  stage: PetStage
  hp: number
  exp: number
  status: PetStatus
  imageUrl: string | null
  story: string
  mood?: string | null

  /** 末日第 N 天诞生 */
  birthDay: number
  /** 陪伴了 N 天（<24h 为 0） */
  ageDays: number
  /** YYYY-MM-DD */
  birthDateStr: string

  /** 是否当前用户拥有 */
  isOwner: boolean

  /** 徽章（稀有/主宠/已放生/死亡 等） */
  badges: PillDesc[]

  /** 原始涂鸦 R2 key，仅 owner 可见 */
  doodleR2Key?: string | null

  // ===== v3.2 生命倒计时与任务统计 =====
  /** 生命终点 UNIX ms；null = 老数据或非 alive */
  lifeExpiresAt: number | null
  /** SSR 生成时的剩余毫秒 snapshot（前端倒计时以此为起点） */
  lifeRemainingMs: number
  /** 派生：'剩 2h 15m' / '已安息 3 天前' / '已放生' / '' */
  lifeStatusLabel: string
  /** 已完成（status='done'）任务数 */
  completedTaskCount: number
}

export interface PillDesc {
  tone: 'neutral' | 'gold' | 'warm' | 'danger' | 'success'
  label: string
}

/**
 * TaskView — 任务的 UI 视图
 */
export interface TaskView {
  id: string
  kind: TaskKind
  prompt: string
  reward: Reward
  rewardText: string           // "HP +10 · EXP +5"
  status: TaskStatus
  verdict: TaskVerdict | null
  /** 活跃？ = pending 或 submitted */
  isActive: boolean
  expiresAt: number
}
