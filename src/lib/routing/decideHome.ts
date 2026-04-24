import type { FullPet } from '@/types/pet'

export type HomeDecision =
  | { kind: 'new' }                    // 无 cookie / 新访客
  | { kind: 'empty' }                  // 有 cookie 但无活宠（都放生/死）
  | { kind: 'pet'; pet: FullPet }      // 有 cookie + 有活宠 → 主宠屏

interface DecideHomeParams {
  user: { userId: string } | null
  pets: FullPet[]
}

/**
 * 首屏分流纯函数。
 * - 新访客：看神笔召唤屏（爆点）
 * - 有活宠的老用户：直达主宠屏
 * - 老用户但活宠都没了：回退神笔召唤屏（保留档案入口）
 *
 * 主宠 = 最新创建的 alive 宠。未来可换策略（手动主宠 / 最后互动 / 等级最高）。
 */
export function decideHome({ user, pets }: DecideHomeParams): HomeDecision {
  if (!user) return { kind: 'new' }
  const alive = pets.filter(p => p.status === 'alive')
  if (alive.length === 0) return { kind: 'empty' }
  const primary = [...alive].sort((a, b) => b.createdAt - a.createdAt)[0]
  return { kind: 'pet', pet: primary }
}
