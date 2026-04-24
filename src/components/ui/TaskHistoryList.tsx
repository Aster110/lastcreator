'use client'
import type { DisplayTask, Reward } from '@/types/task'

interface Props {
  tasks: DisplayTask[]
  className?: string
}

const MEDIA_HOST = 'https://media.lastcreator.cc'

/**
 * 宠物任务履历列表（倒序）。v3.2 §7 任务历史。
 */
export default function TaskHistoryList({ tasks, className = '' }: Props) {
  if (tasks.length === 0) {
    return (
      <div className={`rounded-2xl bg-gray-900/40 border border-gray-800 px-4 py-4 text-center ${className}`}>
        <p className="text-gray-600 text-xs">还没有完成过任务</p>
      </div>
    )
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {tasks.map(t => <HistoryItem key={t.id} task={t} />)}
    </ul>
  )
}

function HistoryItem({ task }: { task: DisplayTask }) {
  const pass = task.status === 'done'
  const rejected = task.status === 'rejected'
  const expired = task.status === 'expired'
  const completion = task.aiVerdict?.completion ?? (pass ? 1 : 0)
  const effective = effectiveRewardText(task.reward, completion)
  const reason = task.aiVerdict?.reason ?? (expired ? '已过期' : '')

  return (
    <li className="rounded-2xl bg-gray-900/60 border border-gray-800 p-3 flex gap-3">
      {/* 缩略图 */}
      <div className="w-16 h-16 rounded-xl bg-gray-800 overflow-hidden shrink-0">
        {task.proofR2Key ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${MEDIA_HOST}/${task.proofR2Key}`}
            alt="proof"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">
            {task.kind === 'photo' ? '📷' : '✏️'}
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-gray-300 text-xs truncate">「{task.prompt}」</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
            pass ? 'bg-emerald-900/40 text-emerald-300'
            : rejected ? 'bg-red-900/40 text-red-300'
            : 'bg-gray-800 text-gray-500'
          }`}>
            {pass ? `✓ ${Math.round(completion * 100)}%` : rejected ? '✗ 未通过' : '已过期'}
          </span>
        </div>
        {reason && (
          <p className="text-gray-600 text-[11px] mt-1 line-clamp-2">{reason}</p>
        )}
        {pass && effective && (
          <p className="text-emerald-400/70 text-[11px] mt-1 tabular-nums">{effective}</p>
        )}
      </div>
    </li>
  )
}

function effectiveRewardText(reward: Reward, completion: number): string {
  const parts: string[] = []
  if (reward.minutes) {
    const m = Math.round(reward.minutes * completion)
    if (m > 0) parts.push(`续命 +${m}min`)
  }
  if (reward.exp) {
    const e = Math.round(reward.exp * completion)
    if (e > 0) parts.push(`EXP +${e}`)
  }
  return parts.join(' · ')
}
