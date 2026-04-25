'use client'
import type { DisplayTask, Reward } from '@/types/task'
import type { ElementId } from '@/types/pet'
import { COPY } from '@/lib/copy/hints'

interface Props {
  task: DisplayTask | null
  dailyDone: number
  dailyMax: number
  element?: ElementId | null
  /** v3.8: 当天剩余 reroll 次数（owner 维度） */
  remainingRerolls?: number
  /** v3.8: reroll 上限（默认 3） */
  maxRerolls?: number
  onOpen(): void
}

/**
 * v3.5: 主宠页的任务入口卡。点击打开全屏 TaskStage。
 * v3.8: 右上角增加"重投 N/M"小字，告知用户卡顿时可换。
 */
export default function TaskEntryCard({
  task,
  dailyDone,
  dailyMax,
  remainingRerolls,
  maxRerolls,
  onOpen,
}: Props) {
  const showReroll = task && typeof remainingRerolls === 'number' && typeof maxRerolls === 'number'

  if (!task) {
    return (
      <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-4">
        <p className="text-gray-300 text-sm">{COPY.task.emptyToday(dailyDone, dailyMax)}</p>
        <p className="text-gray-500 text-xs mt-1">
          {dailyDone >= dailyMax ? COPY.task.resting : COPY.task.noneYet}
        </p>
        <p className="text-gray-600 text-[10px] mt-2">{COPY.pet.lifeRefillHint()}</p>
      </div>
    )
  }

  const isPhoto = task.kind === 'photo'
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-gray-900/70 border border-gray-700 px-4 py-4 active:scale-[0.99] transition-transform hover:border-gray-500 relative"
    >
      {showReroll && (
        <span className="absolute top-2.5 right-3 text-gray-500 text-[10px] tabular-nums">
          重投 {remainingRerolls}/{maxRerolls}
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-[10px] tracking-widest uppercase mb-1.5">
            {isPhoto ? '📷 现实任务' : '✏️ 涂鸦任务'}
          </p>
          <p className="text-white text-sm leading-relaxed line-clamp-2">
            「{task.prompt}」
          </p>
          <p className="text-gray-400 text-[11px] mt-2">
            奖励：{rewardText(task.reward)}
          </p>
        </div>
        <div className="shrink-0 text-white text-xl opacity-60">→</div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-gray-500 text-[10px]">{COPY.task.rewardNote}</p>
        <p className="text-gray-500 text-[10px]">今日 {dailyDone}/{dailyMax}</p>
      </div>
    </button>
  )
}

function rewardText(r: Reward): string {
  const parts: string[] = []
  if (r.minutes) parts.push(`+${r.minutes}min`)
  if (r.exp) parts.push(`+${r.exp} EXP`)
  if (r.mood) parts.push(r.mood)
  return parts.join(' · ') || '神秘'
}
