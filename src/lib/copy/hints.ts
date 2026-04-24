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
  taskStage: {
    introEyebrow: (kind: 'photo' | 'doodle') => (kind === 'photo' ? '📷 现实任务' : '✏️ 涂鸦任务'),
    introTitle: '它希望你……',
    rewardLine: (minutes?: number, exp?: number) => {
      const parts: string[] = []
      if (minutes) parts.push(`续命 +${minutes} 分钟`)
      if (exp) parts.push(`EXP +${exp}`)
      return parts.join(' · ') || '神秘奖励'
    },
    acceptCTA: (kind: 'photo' | 'doodle') => (kind === 'photo' ? '📷 拍给它看' : '✏️ 画给它'),
    cancelCTA: '再想想',
    verifyingInitial: (kind: 'photo' | 'doodle') =>
      `它在端详你的${kind === 'photo' ? '照片' : '涂鸦'}……`,
    verifyingMid: '它在仔细观察细节……',
    verifyingLong: '它在琢磨，再等一会……',
    passTitle: '世界认可了这份证据',
    passCTA: '继续',
    rejectTitle: '它没认出这是它想要的',
    rejectRetry: '换一个任务',
    rejectClose: '先关掉',
  },
  emptyNest: {
    titleWithLast: (name: string) => `${name} 离开了……`,
    subtitleWithLast: '末日安静下来，留给你一个空巢。',
    titleFresh: '末日还在等你',
    subtitleFresh: '随手一笔，召唤你的第一只。',
    summonCTA: '召唤新的生命',
    viewTombstone: '翻看它的墓碑',
  },
  tombstone: {
    livedHeader: '它活过的证据',
    summonNextCTA: '带着记忆召唤新的一只',
    noActionHint: '它已经离开了这个世界。',
  },
  drawFlow: {
    alreadyAliveTitle: '你已经有一只了',
    alreadyAliveSubtitle: '先放生它，才能召唤下一只',
    alreadyAliveCTA: '去看它',
  },
  manage: {
    openLabel: '⚙️ 管理',
    releaseLabel: '🕊️ 放生（不可撤销）',
    releaseConfirm: (name: string) => `放生后 ${name} 就永远自由了。你确定吗？`,
    releaseRunning: '放生中……',
    closeLabel: '关闭',
  },
} as const
