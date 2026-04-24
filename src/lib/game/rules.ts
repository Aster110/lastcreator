// 玩法规则配置。改这里的常量不应影响业务代码结构。

export const MAX_DAILY_TASKS = 2

export const TASK_DEFAULT_EXPIRES_MS = 24 * 60 * 60 * 1000  // 24h

/** 成长阶段规则（v3 占位，v3.1 再用） */
export const STAGE_RULES = {
  幼年: { days: [1, 3] as const },
  青年: { days: [4, 7] as const },
  成年: { days: [8, 14] as const },
  老年: { days: [15, 999] as const },
} as const
