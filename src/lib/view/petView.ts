import type { FullPet } from '@/types/pet'
import type { PetView, PillDesc } from '@/types/view'

const DAY_MS = 86_400_000

export interface PetViewContext {
  /** 当前访问用户的 userId，用于判断 isOwner */
  currentUserId?: string
  /** 末日最早诞生时间（算 birthDay）；缺省 = pet.createdAt（即第 1 天） */
  earliestBirthAt?: number
  /** 已完成（done）任务数；由 SSR 预取传入（无值默认 0） */
  completedTaskCount?: number
  /** 生成 snapshot 的时间戳（SSR 用 Date.now()）；前端可传自定义便于测试 */
  nowMs?: number
}

/**
 * FullPet → PetView 的视图模型 adapter。
 * 纯函数。所有 UI 组件都通过此 adapter 消费 pet 数据。
 */
export function petViewFromFullPet(pet: FullPet, ctx: PetViewContext = {}): PetView {
  const earliest = ctx.earliestBirthAt ?? pet.createdAt
  const now = ctx.nowMs ?? Date.now()
  const birthDay = Math.max(1, Math.floor((pet.createdAt - earliest) / DAY_MS) + 1)
  const ageDays = Math.max(0, Math.floor((now - pet.createdAt) / DAY_MS))
  const d = new Date(pet.createdAt)
  const birthDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const badges: PillDesc[] = []
  if (pet.status === 'released') badges.push({ tone: 'neutral', label: '🕊️ 已放生' })
  if (pet.status === 'dead') badges.push({ tone: 'danger', label: '🕯️ 已安息' })

  const lifeRemainingMs = pet.lifeExpiresAt ? Math.max(0, pet.lifeExpiresAt - now) : 0
  const lifeStatusLabel = computeLifeStatusLabel(pet, lifeRemainingMs, now)

  return {
    id: pet.id,
    name: pet.name,
    habitat: pet.habitat,
    personality: pet.personality,
    skills: pet.skills,
    stage: pet.stage,
    hp: pet.hp,
    exp: pet.exp,
    status: pet.status,
    imageUrl: pet.imageUrl ?? null,
    story: pet.story,
    mood: pet.mood ?? null,
    birthDay,
    ageDays,
    birthDateStr,
    isOwner: ctx.currentUserId ? ctx.currentUserId === pet.ownerId : false,
    badges,
    doodleR2Key: pet.doodleR2Key ?? null,
    lifeExpiresAt: pet.lifeExpiresAt,
    lifeRemainingMs,
    lifeStatusLabel,
    completedTaskCount: ctx.completedTaskCount ?? 0,
  }
}

function computeLifeStatusLabel(pet: FullPet, remainingMs: number, now: number): string {
  if (pet.status === 'released') return '🕊️ 已放生'
  if (pet.status === 'dead') {
    // 用 updatedAt 当"死亡时间"估计值
    const deathDaysAgo = Math.max(0, Math.floor((now - pet.updatedAt) / DAY_MS))
    if (deathDaysAgo <= 0) return '🕯️ 刚刚安息'
    return `🕯️ 已安息 ${deathDaysAgo} 天`
  }
  // alive
  if (!pet.lifeExpiresAt) return '寿命未知'
  if (remainingMs <= 0) return '🕯️ 安息中...'
  return formatRemaining(remainingMs)
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return '<1 min'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86_400)
  const h = Math.floor((totalSec % 86_400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
