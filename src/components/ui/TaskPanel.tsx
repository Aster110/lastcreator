'use client'
import { useState } from 'react'
import PhotoProof from './PhotoProof'
import DoodleProof from './DoodleProof'
import StagedLoading from './StagedLoading'
import type { DisplayTask, Reward } from '@/types/task'

interface Props {
  petId: string
  task: DisplayTask | null
  dailyDone: number
  dailyMax: number
  onCompleted: (state: { hp: number; exp: number }) => void
}

export default function TaskPanel({ petId, task, dailyDone, dailyMax, onCompleted }: Props) {
  const [proofMode, setProofMode] = useState<null | 'photo' | 'doodle'>(null)
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<{ pass: boolean; reason: string } | null>(null)

  if (!task) {
    return (
      <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-4">
        <p className="text-gray-400 text-sm">
          今日已完成 {dailyDone}/{dailyMax} 个任务
        </p>
        <p className="text-gray-600 text-xs mt-1">
          {dailyDone >= dailyMax ? '休息一下，明天继续' : '暂无任务'}
        </p>
      </div>
    )
  }

  const handleSubmit = async (dataUrl: string) => {
    setProofMode(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      const data = (await res.json()) as {
        task?: DisplayTask
        verdict?: { pass: boolean; reason: string }
        state?: { hp: number; exp: number }
      }
      if (data.verdict) {
        setOutcome({ pass: data.verdict.pass, reason: data.verdict.reason })
      }
      if (data.verdict?.pass && data.state) {
        onCompleted({ hp: data.state.hp, exp: data.state.exp })
      }
    } catch (err) {
      console.error('submit failed', err)
      setOutcome({ pass: false, reason: '提交失败，请重试' })
    }
    setSubmitting(false)
  }

  if (proofMode === 'photo') return <PhotoProof onSubmit={handleSubmit} onCancel={() => setProofMode(null)} />
  if (proofMode === 'doodle') return <DoodleProof onSubmit={handleSubmit} onCancel={() => setProofMode(null)} />

  return (
    <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-4">
      {/* 任务卡片 */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs tracking-widest uppercase mb-1.5">
            {task.kind === 'photo' ? '📷 现实任务' : '✏️ 涂鸦任务'}
          </p>
          <p className="text-gray-200 text-sm leading-relaxed">「{task.prompt}」</p>
          <p className="text-gray-600 text-xs mt-2">
            奖励：{rewardText(task.reward)}
          </p>
        </div>
      </div>

      {/* Outcome */}
      {outcome && (
        <div
          className={`mt-3 px-3 py-2 rounded-lg text-xs ${
            outcome.pass ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'
          }`}
        >
          {outcome.pass ? '✓ ' : '✗ '}
          {outcome.reason}
        </div>
      )}

      {/* CTA / 提交期过场动画 */}
      {task.status === 'pending' && !outcome && (
        submitting ? (
          <StagedLoading
            active={submitting}
            stages={[
              { at: 0, content: `🔍 AI 正在端详你的${task.kind === 'photo' ? '照片' : '涂鸦'}...` },
              { at: 5000, content: '🔎 AI 正在仔细观察细节...' },
              { at: 15000, content: '🤔 AI 在琢磨中，再等一会...' },
            ]}
            className="mt-4 text-center text-gray-400 text-sm py-3"
          />
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setProofMode(task.kind)}
              className="flex-1 h-11 rounded-full bg-white text-gray-900 text-sm font-semibold active:scale-95 transition-transform"
            >
              {task.kind === 'photo' ? '去拍照' : '去涂鸦'}
            </button>
          </div>
        )
      )}

      <p className="text-gray-700 text-[10px] mt-3 text-right">
        今日 {dailyDone}/{dailyMax}
      </p>
    </div>
  )
}

function rewardText(r: Reward): string {
  const parts: string[] = []
  if (r.minutes) parts.push(`续命 +${r.minutes}min`)
  if (r.exp) parts.push(`EXP +${r.exp}`)
  if (r.mood) parts.push(`情绪 ${r.mood}`)
  return parts.join(' · ') || '神秘'
}
