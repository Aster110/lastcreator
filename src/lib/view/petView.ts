import type { FullPet } from '@/types/pet'
import type { PetView, PillDesc } from '@/types/view'

const DAY_MS = 86_400_000

export interface PetViewContext {
  /** 当前访问用户的 userId，用于判断 isOwner */
  currentUserId?: string
  /** 末日最早诞生时间（用来算 birthDay）；缺省 = pet.createdAt，即第 1 天 */
  earliestBirthAt?: number
}

/**
 * FullPet → PetView 的视图模型 adapter。
 *
 * 所有 UI 组件应通过此 adapter 消费 pet 数据，不要直接吃 FullPet。
 * 新增字段时：
 *   1. 改 types/view.ts 的 PetView
 *   2. 在此 adapter 里算出字段
 *   3. UI 组件直接用
 */
export function petViewFromFullPet(pet: FullPet, ctx: PetViewContext = {}): PetView {
  const earliest = ctx.earliestBirthAt ?? pet.createdAt
  const birthDay = Math.max(1, Math.floor((pet.createdAt - earliest) / DAY_MS) + 1)
  const ageDays = Math.max(0, Math.floor((Date.now() - pet.createdAt) / DAY_MS))
  const d = new Date(pet.createdAt)
  const birthDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const badges: PillDesc[] = []
  if (pet.status === 'released') badges.push({ tone: 'neutral', label: '🕊️ 已放生' })
  if (pet.status === 'dead') badges.push({ tone: 'danger', label: '🕯️ 已安息' })
  if (pet.memoryFromPetId) badges.push({ tone: 'gold', label: '✧ 记忆传承' })

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
    memoryFromPetId: pet.memoryFromPetId ?? null,
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
