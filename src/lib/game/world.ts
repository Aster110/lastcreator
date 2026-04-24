import { earliestPetCreatedAt, countAlivePets, sumAliveHp } from '@/lib/repo/pets'

const DAY_MS = 86_400_000

export interface WorldState {
  dayCount: number
  totalHp: number
  petCount: number
}

/**
 * 末日第 N 天 = floor((now - 最早 pet 诞生时间) / 1 天) + 1
 * 无 pet 时 = 1
 */
export async function computeWorld(): Promise<WorldState> {
  const [earliest, petCount, totalHp] = await Promise.all([
    earliestPetCreatedAt(),
    countAlivePets(),
    sumAliveHp(),
  ])
  const dayCount = earliest ? Math.floor((Date.now() - earliest) / DAY_MS) + 1 : 1
  return { dayCount, petCount, totalHp }
}

/**
 * 某只宠物诞生于末日第 N 天
 */
export async function computePetBirthDay(petCreatedAt: number): Promise<number> {
  const earliest = await earliestPetCreatedAt()
  if (!earliest) return 1
  return Math.floor((petCreatedAt - earliest) / DAY_MS) + 1
}

/**
 * 宠物存活天数（向下取整，< 24h 视为 0）
 */
export function computePetAgeDays(petCreatedAt: number): number {
  return Math.floor((Date.now() - petCreatedAt) / DAY_MS)
}
