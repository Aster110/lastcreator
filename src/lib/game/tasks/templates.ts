import { TASK_DEFAULT_EXPIRES_MS } from '@/lib/game/rules'
import type { TaskKind, Reward } from '@/types/task'

export interface TaskTemplate {
  kind: TaskKind
  prompt: string          // 给用户看的文字（宠物第一人称）
  verifyHint: string      // 给 verifier 看的（"图中应该有食物"）
  reward: Reward
  expiresInMs: number
}

// v3.2：reward 主奖励通道换成 minutes（续命分钟）。
// 完美完成（completion=1）= 满额；勉强 pass（completion=0.5）= 一半。
// hp 字段保留 0 以兼容 rewards.ts 的老路径（实际不再应用）。

export const PHOTO_TEMPLATES: TaskTemplate[] = [
  {
    kind: 'photo',
    prompt: '我饿了，帮我找点食物',
    verifyHint: '图中包含食物、水果、饮品或任何可食用的东西',
    reward: { minutes: 120, exp: 20 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    kind: 'photo',
    prompt: '我想看看外面的世界',
    verifyHint: '图是户外场景，天空、街道、自然风光都行',
    reward: { minutes: 150, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    kind: 'photo',
    prompt: '给我看你最爱的东西',
    verifyHint: '任何有意义的物品或场景都行',
    reward: { minutes: 100, exp: 10 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
]

export const DOODLE_TEMPLATES: TaskTemplate[] = [
  {
    kind: 'doodle',
    prompt: '帮我画一把武器',
    verifyHint: '涂鸦中有武器、剑、枪、棍等形状',
    reward: { minutes: 120, exp: 40 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    kind: 'doodle',
    prompt: '画个家，我想安顿下来',
    verifyHint: '涂鸦中有房子、屋顶、门窗等',
    reward: { minutes: 180, exp: 20 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    kind: 'doodle',
    prompt: '给我画个伙伴',
    verifyHint: '涂鸦中有生物、动物或人形',
    reward: { minutes: 150, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
]

export function randomTemplate(): TaskTemplate {
  const all = [...PHOTO_TEMPLATES, ...DOODLE_TEMPLATES]
  return all[Math.floor(Math.random() * all.length)]
}
