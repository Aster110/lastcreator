/**
 * v3.9 召唤等待台词池（waitingForPet 阶段用）。
 * 用户提交涂鸦后 AI 还没生成完时显示，1.5-2s 随机切换一条。
 *
 * 风格：末日 + 召唤 + 神秘感。
 * 数量：>= 10 条，避免短时间内重复。
 */
export const GEN_LINES: readonly string[] = [
  '墨迹正在显形…',
  '画师在解读你的笔触…',
  'AI 正在为它赋予灵魂…',
  '末日认出了它的样子…',
  '它的元素正在凝结…',
  '末日记忆中的某种生灵走来了…',
  '它的眼睛正在睁开…',
  '它在选择属于自己的栖息地…',
  '它好像听见你了…',
  '让它确认一下名字…',
  '它的故事即将展开…',
  '时间在它身上沉淀…',
  '笔触在颤动…',
] as const

/**
 * 随机抽一条，避免连续两条相同（如果上一条 prev 不为 null）。
 */
export function pickGenLine(prev: string | null = null): string {
  if (GEN_LINES.length <= 1) return GEN_LINES[0]
  let line = GEN_LINES[Math.floor(Math.random() * GEN_LINES.length)]
  // 避免连续重复（最多重抽 1 次）
  if (prev && line === prev) {
    line = GEN_LINES[(GEN_LINES.indexOf(line) + 1) % GEN_LINES.length]
  }
  return line
}
