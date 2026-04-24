import { TASK_DEFAULT_EXPIRES_MS } from '@/lib/game/rules'
import type { TaskKind, Reward } from '@/types/task'
import type { ElementId } from '@/types/pet'

/**
 * v3.7 Template shape
 *
 * 骨架式任务模板，AI 在 promptSkeleton 里填 slots，生成个性化 prompt。
 * verifyHint 是稳定锚点，AI 不碰，保证 Claude Vision 判得准。
 * defaultPrompt 是 AI 失败时的兜底。
 */
export interface TaskTemplate {
  id: string                          // 稳定标识（日志/分析）
  kind: TaskKind
  element: ElementId | null           // null = 通用池；其他 = 该元素专属
  promptSkeleton: string              // 含 {slot} 占位符，如 "找 {subject}"
  slots: string[]                     // 要填的 slot 名
  defaultPrompt: string               // AI 填失败时直接用
  verifyHint: string                  // 稳定 verify 线索（AI 不碰）
  reward: Reward
  expiresInMs: number
}

// =============================================================================
// v3.7 元素专属模板（18 条：6 元素 × 3）
// =============================================================================

export const ELEMENT_TEMPLATES: TaskTemplate[] = [
  // ---------- ruins（废墟） ----------
  {
    id: 'ruins-food',
    kind: 'photo',
    element: 'ruins',
    promptSkeleton: '末日里我饿了，帮我找 {subject}',
    slots: ['subject'],
    defaultPrompt: '末日里我饿了，帮我找点能吃的',
    verifyHint: '图中包含食物、水果、饮品或任何可食用的东西',
    reward: { minutes: 420, exp: 20 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'ruins-shelter',
    kind: 'photo',
    element: 'ruins',
    promptSkeleton: '带我看看 {subject}，有遮蔽的地方',
    slots: ['subject'],
    defaultPrompt: '带我看看一处能躲的角落',
    verifyHint: '图中有墙壁、屋檐、门洞、帐篷或任何遮蔽结构',
    reward: { minutes: 360, exp: 25 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'ruins-home',
    kind: 'doodle',
    element: 'ruins',
    promptSkeleton: '画一个 {subject} 让我安顿',
    slots: ['subject'],
    defaultPrompt: '画一个家让我安顿',
    verifyHint: '涂鸦中有房子、屋顶、门窗等建筑意象',
    reward: { minutes: 540, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },

  // ---------- fire（火） ----------
  {
    id: 'fire-warm',
    kind: 'photo',
    element: 'fire',
    promptSkeleton: '末日太冷，让我看看 {subject}',
    slots: ['subject'],
    defaultPrompt: '让我看看一处温暖的光',
    verifyHint: '图中有灯光、火光、蜡烛、暖色调光源',
    reward: { minutes: 420, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'fire-heat',
    kind: 'photo',
    element: 'fire',
    promptSkeleton: '我想感受 {subject}，能让我兴奋的',
    slots: ['subject'],
    defaultPrompt: '我想感受暖色调的东西',
    verifyHint: '图中含有红/橙/黄等暖色调或温度意象',
    reward: { minutes: 360, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'fire-weapon',
    kind: 'doodle',
    element: 'fire',
    promptSkeleton: '画把 {subject} 让我守护你',
    slots: ['subject'],
    defaultPrompt: '画把武器让我守护你',
    verifyHint: '涂鸦中有武器、剑、枪、棍等形状',
    reward: { minutes: 480, exp: 40 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },

  // ---------- water（水） ----------
  {
    id: 'water-flow',
    kind: 'photo',
    element: 'water',
    promptSkeleton: '让我听到 {subject} 的声音',
    slots: ['subject'],
    defaultPrompt: '让我听到水流动的声音',
    verifyHint: '图中有水、液体、水面、杯中液体或任何流体',
    reward: { minutes: 420, exp: 25 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'water-mirror',
    kind: 'photo',
    element: 'water',
    promptSkeleton: '我想透过 {subject} 看世界',
    slots: ['subject'],
    defaultPrompt: '我想透过反光的表面看世界',
    verifyHint: '图中有镜面、水面、玻璃、屏幕等反光介质',
    reward: { minutes: 360, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'water-life',
    kind: 'doodle',
    element: 'water',
    promptSkeleton: '画一个 {subject}，它代表新生',
    slots: ['subject'],
    defaultPrompt: '画一棵树，它代表新生',
    verifyHint: '涂鸦中有植物、树、花、种子等生命意象',
    reward: { minutes: 480, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },

  // ---------- ice（冰） ----------
  {
    id: 'ice-cold',
    kind: 'photo',
    element: 'ice',
    promptSkeleton: '让我看 {subject}，冷冽的东西',
    slots: ['subject'],
    defaultPrompt: '让我看冰冷、金属、坚硬的东西',
    verifyHint: '图中有金属、冰、玻璃、冷色调物体',
    reward: { minutes: 420, exp: 25 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'ice-still',
    kind: 'photo',
    element: 'ice',
    promptSkeleton: '给我看一个 {subject}，静止而坚硬',
    slots: ['subject'],
    defaultPrompt: '给我看一个安静的物品',
    verifyHint: '图中有静态物品、石头、雕塑、结构体',
    reward: { minutes: 360, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'ice-crystal',
    kind: 'doodle',
    element: 'ice',
    promptSkeleton: '画一个 {subject}，像结晶一样',
    slots: ['subject'],
    defaultPrompt: '画一个晶体或几何形状',
    verifyHint: '涂鸦中有几何形状、尖角、对称结构',
    reward: { minutes: 480, exp: 35 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },

  // ---------- dark（暗） ----------
  {
    id: 'dark-night',
    kind: 'photo',
    element: 'dark',
    promptSkeleton: '我想看 {subject}，暗处的世界',
    slots: ['subject'],
    defaultPrompt: '我想看夜晚的世界',
    verifyHint: '图中主色调偏暗，有阴影/夜晚/暗色元素',
    reward: { minutes: 420, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'dark-shadow',
    kind: 'photo',
    element: 'dark',
    promptSkeleton: '拍一张 {subject}，带神秘感',
    slots: ['subject'],
    defaultPrompt: '拍一张带阴影的画面',
    verifyHint: '图中明显有阴影、低光、对比强烈的明暗关系',
    reward: { minutes: 360, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'dark-companion',
    kind: 'doodle',
    element: 'dark',
    promptSkeleton: '给我画个 {subject}，暗夜里的伙伴',
    slots: ['subject'],
    defaultPrompt: '给我画个伙伴的剪影',
    verifyHint: '涂鸦中有生物、人形、动物轮廓',
    reward: { minutes: 480, exp: 40 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },

  // ---------- sky（天空） ----------
  {
    id: 'sky-vast',
    kind: 'photo',
    element: 'sky',
    promptSkeleton: '让我看一眼 {subject}，广阔的',
    slots: ['subject'],
    defaultPrompt: '让我看一眼天空',
    verifyHint: '图中有天空、云、远景、开阔视野',
    reward: { minutes: 420, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'sky-flight',
    kind: 'photo',
    element: 'sky',
    promptSkeleton: '我想看 {subject}，会飞的或高处的',
    slots: ['subject'],
    defaultPrompt: '我想看一个高处的东西',
    verifyHint: '图中有鸟、飞机、高楼、高处物体或仰拍视角',
    reward: { minutes: 360, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'sky-path',
    kind: 'doodle',
    element: 'sky',
    promptSkeleton: '画一条 {subject}，带我走远',
    slots: ['subject'],
    defaultPrompt: '画一条路带我走远',
    verifyHint: '涂鸦中有路、线条、箭头、方向感的图形',
    reward: { minutes: 480, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
]

// =============================================================================
// v3.7 通用模板池（element=null，AI 失败或 pet.element=null 的 fallback）
// 保留 v3.6 原 6 条，加 skeleton 化
// =============================================================================

export const GENERIC_TEMPLATES: TaskTemplate[] = [
  {
    id: 'generic-food',
    kind: 'photo',
    element: null,
    promptSkeleton: '我饿了，帮我找 {subject}',
    slots: ['subject'],
    defaultPrompt: '我饿了，帮我找点食物',
    verifyHint: '图中包含食物、水果、饮品或任何可食用的东西',
    reward: { minutes: 420, exp: 20 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'generic-outside',
    kind: 'photo',
    element: null,
    promptSkeleton: '我想看 {subject}，外面的世界',
    slots: ['subject'],
    defaultPrompt: '我想看看外面的世界',
    verifyHint: '图是户外场景，天空、街道、自然风光都行',
    reward: { minutes: 480, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'generic-love',
    kind: 'photo',
    element: null,
    promptSkeleton: '给我看 {subject}，你珍惜的',
    slots: ['subject'],
    defaultPrompt: '给我看你最爱的东西',
    verifyHint: '任何有意义的物品或场景都行',
    reward: { minutes: 360, exp: 10 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'generic-weapon',
    kind: 'doodle',
    element: null,
    promptSkeleton: '帮我画一把 {subject}',
    slots: ['subject'],
    defaultPrompt: '帮我画一把武器',
    verifyHint: '涂鸦中有武器、剑、枪、棍等形状',
    reward: { minutes: 480, exp: 40 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'generic-home',
    kind: 'doodle',
    element: null,
    promptSkeleton: '画个 {subject}，我想安顿下来',
    slots: ['subject'],
    defaultPrompt: '画个家我想安顿下来',
    verifyHint: '涂鸦中有房子、屋顶、门窗等',
    reward: { minutes: 540, exp: 20 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
  {
    id: 'generic-friend',
    kind: 'doodle',
    element: null,
    promptSkeleton: '给我画个 {subject}，陪我一程',
    slots: ['subject'],
    defaultPrompt: '给我画个伙伴',
    verifyHint: '涂鸦中有生物、动物或人形',
    reward: { minutes: 420, exp: 30 },
    expiresInMs: TASK_DEFAULT_EXPIRES_MS,
  },
]

/** 全部模板（元素 + 通用） */
export const ALL_TEMPLATES: TaskTemplate[] = [...ELEMENT_TEMPLATES, ...GENERIC_TEMPLATES]

// =============================================================================
// Legacy exports（v3.6 balance.test.ts 仍依赖）
// =============================================================================

/** @deprecated v3.7 起用 ALL_TEMPLATES + pickTemplateForPet */
export const PHOTO_TEMPLATES: TaskTemplate[] = ALL_TEMPLATES.filter(t => t.kind === 'photo')
/** @deprecated v3.7 起用 ALL_TEMPLATES + pickTemplateForPet */
export const DOODLE_TEMPLATES: TaskTemplate[] = ALL_TEMPLATES.filter(t => t.kind === 'doodle')

/** @deprecated v3.7 起用 pickTemplateForPet（见 taskPrompt.ts） */
export function randomTemplate(): TaskTemplate {
  return ALL_TEMPLATES[Math.floor(Math.random() * ALL_TEMPLATES.length)]
}
