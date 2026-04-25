'use client'
import { useRef, useState } from 'react'
import type { DisplayTask, TaskVerdict, Reward } from '@/types/task'
import type { FullPet } from '@/types/pet'
import TaskIntro from './TaskIntro'
import TaskResult from './TaskResult'
import PhotoProof from './PhotoProof'
import DoodleProof from './DoodleProof'
import StagedLoading from './StagedLoading'
import { result, haptic } from '@/lib/ui/feedback'
import { COPY } from '@/lib/copy/hints'

type Phase = 'intro' | 'challenge' | 'verifying' | 'result'

interface Props {
  open: boolean
  petId: string
  task: DisplayTask | null
  pet: FullPet
  onClose(): void
  /**
   * v3.5: 父组件收到 next 后原子 setPet(hp, exp, lifeExpiresAt)，修复 state 同步 bug #4。
   * 仅 pass 时触发；reject 不调。
   */
  onCompleted(next: { hp: number; exp: number; lifeExpiresAt: number | null }): void
  /** v3.8: 当天剩余 reroll 次数 */
  remainingRerolls?: number
  /**
   * v3.8: 父组件应该（1）调 reroll API（2）拿到新 task 后用它替换 task prop。
   * 这里只负责"按钮 → 触发"，不做 fetch（避免重复 fetch 逻辑）。
   */
  onReroll?(currentTaskId: string): Promise<void>
}

interface SubmitResponse {
  task?: DisplayTask
  verdict?: TaskVerdict
  state?: { hp: number; exp: number; lifeExpiresAt: number | null }
  effectiveReward?: Reward
  lifeExtendedMs?: number
}

/**
 * v3.5 任务剧场 · 四幕状态机容器
 * intro → challenge(photo/doodle) → verifying → result(pass/reject)
 *
 * v3.8: TaskIntro 加"换一个" CTA。reroll 流程：
 * 1. 用户点 onReroll → setRerolling(true)
 * 2. 父组件 onReroll(currentTaskId) 内部走 API → 替换 task prop
 * 3. setRerolling(false)；TaskIntro 拿到新 task prop，自动 re-render
 */
export default function TaskStage({
  open,
  task,
  pet,
  onClose,
  onCompleted,
  remainingRerolls,
  onReroll,
}: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const prevExpiresAtRef = useRef<number | null>(pet.lifeExpiresAt ?? null)
  const [submitResp, setSubmitResp] = useState<SubmitResponse | null>(null)
  const [proofKind, setProofKind] = useState<'photo' | 'doodle' | null>(null)
  const [rerolling, setRerolling] = useState(false)

  if (!open) return null
  if (!task) {
    onClose()
    return null
  }

  const handleAccept = (kind: 'photo' | 'doodle') => {
    prevExpiresAtRef.current = pet.lifeExpiresAt ?? null
    setProofKind(kind)
    setPhase('challenge')
  }

  const handleReroll = async () => {
    if (!onReroll || rerolling) return
    setRerolling(true)
    try {
      await onReroll(task.id)
    } catch (err) {
      console.error('[TaskStage] reroll failed', err)
      haptic('warn')
    } finally {
      setRerolling(false)
    }
  }

  const handleSubmit = async (dataUrl: string) => {
    setPhase('verifying')
    try {
      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      const data = (await res.json()) as SubmitResponse
      setSubmitResp(data)
      setPhase('result')
      if (data.verdict?.pass && data.state) {
        const minutes = Math.round((data.lifeExtendedMs ?? 0) / 60_000)
        const exp = data.effectiveReward?.exp
        result('pass', COPY.task.passMsg, { minutes, exp })
      } else if (data.verdict) {
        haptic('warn')
      }
    } catch (err) {
      console.error('[TaskStage] submit failed', err)
      setSubmitResp({
        verdict: { pass: false, completion: 0, reason: '提交失败，请重试' },
      })
      setPhase('result')
      haptic('error')
    }
  }

  const handleCancelProof = () => {
    setProofKind(null)
    setPhase('intro')
  }

  const handleResultClose = () => {
    if (submitResp?.verdict?.pass && submitResp.state) {
      onCompleted({
        hp: submitResp.state.hp,
        exp: submitResp.state.exp,
        lifeExpiresAt: submitResp.state.lifeExpiresAt ?? null,
      })
    }
    setPhase('intro')
    setSubmitResp(null)
    setProofKind(null)
    onClose()
  }

  const handleResultRetry = () => {
    handleResultClose()
  }

  // intro
  if (phase === 'intro') {
    return (
      <TaskIntro
        task={task}
        element={pet.element ?? null}
        onAccept={handleAccept}
        onCancel={onClose}
        remainingRerolls={remainingRerolls}
        onReroll={onReroll ? handleReroll : undefined}
        rerolling={rerolling}
      />
    )
  }

  // challenge
  if (phase === 'challenge' && proofKind === 'photo') {
    return <PhotoProof onSubmit={handleSubmit} onCancel={handleCancelProof} />
  }
  if (phase === 'challenge' && proofKind === 'doodle') {
    return (
      <DoodleProof
        onSubmit={handleSubmit}
        onCancel={handleCancelProof}
        hint={COPY.task.doodleHint(task.prompt)}
      />
    )
  }

  // verifying
  if (phase === 'verifying') {
    return <VerifyingLayer task={task} pet={pet} />
  }

  // result
  if (phase === 'result' && submitResp?.verdict) {
    return (
      <TaskResult
        verdict={submitResp.verdict}
        pet={pet}
        prevExpiresAt={prevExpiresAtRef.current}
        newExpiresAt={submitResp.state?.lifeExpiresAt ?? prevExpiresAtRef.current}
        effectiveReward={submitResp.effectiveReward}
        onRetry={handleResultRetry}
        onClose={handleResultClose}
      />
    )
  }

  return null
}

function VerifyingLayer({ task, pet }: { task: DisplayTask; pet: FullPet }) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-8 px-6">
      <div className="w-40 h-40 rounded-2xl bg-gray-800 overflow-hidden anim-breathe">
        {pet.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-white">🐾</div>
        )}
      </div>
      <StagedLoading
        active
        stages={[
          { at: 0, content: COPY.taskStage.verifyingInitial(task.kind) },
          { at: 5000, content: COPY.taskStage.verifyingMid },
          { at: 15000, content: COPY.taskStage.verifyingLong },
        ]}
        className="text-gray-300 text-sm text-center min-h-[1.5rem]"
      />
    </div>
  )
}
