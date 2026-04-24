/**
 * 引导/功能文案的集中库（轻量 i18n / copy map）。
 *
 * 原则：
 * - 组件里不再出现"做任务可续命"这类散布重复的硬字符串
 * - 需要调文案时改这里一处
 * - 不做真正的 i18n（未来要就挪到 next-intl）
 */

export const COPY = {
  pet: {
    lifeRemainingLabel: '剩余生命',
    lifeRefillHint: '做任务可续命 · 每日最多 2 次',
    lifeUnknown: '寿命未知',
    deceased: '🕯️ 已安息',
    released: '🕊️ 已放生',
  },
  task: {
    rewardNote: '奖励按完成度打折',
    emptyToday: (done: number, max: number) => `今日已完成 ${done}/${max} 个任务`,
    resting: '休息一下，明天继续',
    noneYet: '暂无任务',
    photoCTA: '去拍照',
    doodleCTA: '去涂鸦',
    doodleHint: (prompt: string) => `画：${prompt}`,
    waitingInitial: (kind: 'photo' | 'doodle') =>
      `🔍 AI 正在端详你的${kind === 'photo' ? '照片' : '涂鸦'}...`,
    waitingMid: '🔎 AI 正在仔细观察细节...',
    waitingLong: '🤔 AI 在琢磨中，再等一会...',
    passMsg: '🎉 任务完成',
    failMsg: (reason: string) => `✗ ${reason}`,
  },
  home: {
    summonCTA: '开始召唤',
    againCTA: '+ 再画一只',
    detailCTA: '👤 详情',
    galleryCTA: '档案',
  },
} as const
