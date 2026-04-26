/**
 * v4.1 用户偏好聚合器。
 *
 * 输入：memory_tags（按 owner_id 查出的所有 tag 行）
 * 输出：UserPreference（top-N tags，按 count desc / weight desc 排序）
 *
 * 拆 pure / async 两层：
 *   - aggregateMemoryTags（pure）：rows → UserPreference 子集；可单测无 D1
 *   - getUserPreference（async）：调 repo + 转 pure 函数
 *
 * §8a #3 提示：events bus 不跨 instance；这里走 D1 query 实时聚合
 *   v4.x 信号触发后再做 Cron / cache（接口不变）。
 */
import { listMemoryTagsByOwner } from '@/lib/repo/memoryTags'
import type { MemoryTag } from '@/types/memoryTag'
import type { UserPreference, PreferenceTag } from '@/types/profile'

export const DEFAULT_TOP_N = 10
/** 上限保护：单 owner 累计 tag 太多时不全聚合（DAU 个位数远未到此） */
export const DEFAULT_TAG_LIMIT = 500

/**
 * 纯函数：聚合 memory_tags 为 topTags + 总数 + lastUpdated。
 *
 * 算法：
 *   1. 对 (tag) 分组，count = 出现次数，weightSum = sum(weight)
 *   2. weight 平均 = weightSum / count
 *   3. 排序：count desc，count 同 → 平均 weight desc
 *   4. 取 top-N
 */
export function aggregateMemoryTags(
  ownerId: string,
  rows: MemoryTag[],
  topN: number = DEFAULT_TOP_N,
): UserPreference {
  const buckets = new Map<string, { count: number; weightSum: number }>()
  let lastUpdated = 0

  for (const r of rows) {
    if (r.createdAt > lastUpdated) lastUpdated = r.createdAt
    const cur = buckets.get(r.tag) ?? { count: 0, weightSum: 0 }
    cur.count++
    cur.weightSum += r.weight
    buckets.set(r.tag, cur)
  }

  const topTags: PreferenceTag[] = [...buckets.entries()]
    .map(([tag, v]) => ({
      tag,
      count: v.count,
      weight: v.count > 0 ? v.weightSum / v.count : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.weight - a.weight
    })
    .slice(0, topN)

  return {
    ownerId,
    topTags,
    totalMemories: rows.length,
    lastUpdated,
  }
}

/**
 * Async：取 owner 的 memory_tags + 聚合。
 * 失败/无数据 → 返空 profile（不抛错，让派单走默认权重）。
 */
export async function getUserPreference(
  ownerId: string,
  topN: number = DEFAULT_TOP_N,
  tagLimit: number = DEFAULT_TAG_LIMIT,
): Promise<UserPreference> {
  try {
    const rows = await listMemoryTagsByOwner(ownerId, tagLimit)
    return aggregateMemoryTags(ownerId, rows, topN)
  } catch (err) {
    console.warn('[aggregator] getUserPreference failed', err)
    return {
      ownerId,
      topTags: [],
      totalMemories: 0,
      lastUpdated: 0,
    }
  }
}
