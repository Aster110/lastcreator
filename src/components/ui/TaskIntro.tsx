'use client'
import type { DisplayTask } from '@/types/task'
import type { ElementId } from '@/types/pet'
import { COPY } from '@/lib/copy/hints'

const ELEMENT_BG: Record<ElementId, string> = {
  ruins: '/bg/ruins.jpg',
  fire: '/bg/fire.jpg',
  water: '/bg/water.jpg',
  ice: '/bg/ice.jpg',
  dark: '/bg/dark.jpg',
  sky: '/bg/sky.jpg',
}

interface Props {
  task: DisplayTask
  element?: ElementId | null
  /** v3.9.1: 接收用户实际选的 kind（默认 task.kind = 模板期望，但用户可选另一种） */
  onAccept(actualKind: 'photo' | 'doodle'): void
  onCancel(): void
  /** v3.8: 当天剩余 reroll 次数 */
  remainingRerolls?: number
  /** v3.8: 触发"换一个"；外层调 reroll API + 替换 task prop */
  onReroll?(): void
  /** v3.8: reroll 进行中时禁用按钮 */
  rerolling?: boolean
}

/**
 * v3.5 任务剧场 · 第一幕：接受任务。
 * v3.8: 加"换一个 (剩 N)" CTA；剩 0 时不显示该按钮。
 * 动画节奏见 14-任务剧场与单宠范式.md §附录 A
 */
export default function TaskIntro({
  task,
  element,
  onAccept,
  onCancel,
  remainingRerolls,
  onReroll,
  rerolling,
}: Props) {
  const bgUrl = element ? ELEMENT_BG[element] : '/daily-bg.jpg'
  const isPhoto = task.kind === 'photo'
  const canReroll =
    typeof remainingRerolls === 'number' && remainingRerolls > 0 && !!onReroll

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      {/* 遮罩：统一反差 */}
      <div className="absolute inset-0 bg-black/55 pointer-events-none anim-fade" />

      {/* 关闭按钮 */}
      <button
        onClick={onCancel}
        className="absolute top-8 left-5 w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]"
        aria-label="关闭"
      >
        ←
      </button>

      {/* 主体：居中垂直布局 */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 gap-8">
        {/* 眉头：任务类型 */}
        <p
          className="text-white/80 text-xs tracking-[0.3em] uppercase anim-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          {COPY.taskStage.introEyebrow(task.kind)}
        </p>

        {/* 子标题 */}
        <p
          className="text-white/60 text-sm anim-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          {COPY.taskStage.introTitle}
        </p>

        {/* 大 prompt */}
        <p
          className="text-white text-2xl leading-relaxed text-center max-w-md anim-scale-in [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]"
          style={{ animationDelay: '100ms' }}
        >
          「{task.prompt}」
        </p>

        {/* 奖励条 */}
        <div
          className="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm anim-fade-up"
          style={{ animationDelay: '450ms' }}
        >
          <p className="text-white text-sm tabular-nums">
            {COPY.taskStage.rewardLine(task.reward.minutes, task.reward.exp)}
          </p>
        </div>
      </div>

      {/* 底部 CTA */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 flex flex-col gap-2 anim-fade-up"
        style={{ animationDelay: '650ms' }}
      >
        {/* v3.9.1: 主 CTA = task.kind（模板期望）；次 CTA = 另一种 kind 代替 */}
        <button
          onClick={() => onAccept(task.kind)}
          disabled={rerolling}
          className="w-full h-14 rounded-full bg-white text-gray-900 text-base font-semibold active:scale-[0.98] transition-transform anim-breathe disabled:opacity-50 disabled:anim-none"
        >
          {COPY.taskStage.acceptCTA(task.kind)}
          <span className="sr-only"> · {isPhoto ? '拍照提交' : '涂鸦提交'}</span>
        </button>
        {/* v3.9.1: 用另一种 kind 代替（次要权重，弱视觉） */}
        <button
          onClick={() => onAccept(isPhoto ? 'doodle' : 'photo')}
          disabled={rerolling}
          className="w-full h-11 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {COPY.taskStage.altKindCTA(task.kind)}
        </button>
        {canReroll && (
          <button
            onClick={onReroll}
            disabled={rerolling}
            className="w-full h-11 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {rerolling
              ? COPY.taskStage.rerollLoading
              : COPY.taskStage.rerollCTA(remainingRerolls)}
          </button>
        )}
        <button
          onClick={onCancel}
          disabled={rerolling}
          className="w-full h-10 text-white/70 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {COPY.taskStage.cancelCTA}
        </button>
      </div>
    </div>
  )
}
