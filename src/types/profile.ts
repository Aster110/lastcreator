/**
 * v4.1 用户偏好画像类型。
 *
 * 由 lib/game/profile/aggregator 从 memory_tags 聚合得到。
 * 注入 PickOptions.userPreference 后，pickTemplateForPet 加权层据此放大命中模板。
 */

export interface PreferenceTag {
  tag: string
  /** 次数（出现 N 条 memory_tags） */
  count: number
  /** 平均权重（confidence 平均值） */
  weight: number
}

export interface UserPreference {
  ownerId: string
  /** 按 count desc / weight desc 排序的 top-N（默认 10） */
  topTags: PreferenceTag[]
  /** 该 owner 累计 memory_tags 总数（含重复 tag）*/
  totalMemories: number
  /** 最近一条 memory_tag 的 created_at（缓存判断用） */
  lastUpdated: number
}
