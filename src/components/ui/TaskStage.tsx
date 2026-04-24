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
 *
 * intro → challenge(photo/doodle) → verifying → result(pass/reject)
 *
 * 关闭规则：
 * - intro / result：允许关闭
 * - challenge / verifying：禁用关闭（防误触，submit 进行中）
 *
 * state bug 修复：
 * - submit response 含 state.lifeExpiresAt（v3.2 已有），通过 onCompleted 透传父组件
 */
export default function TaskStage({ open, task, pet, onClose, onCompleted }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  // 进入 challenge 之前捕获旧的 lifeExpiresAt，给结果幕做 tween 动画素材
  const prevExpiresAtRef = useRef<number | null>(pet.lifeExpiresAt ?? null)
  const [submitResp, setSubmitResp] = useState<SubmitResponse | null>(null)
  const [proofKind, setProofKind] = useState<'photo' | 'doodle' | null>(null)

  if (!open) return null
  if (!task) {
    // 理论上入口卡会处理 task=null，这里保险兜底
    onClose()
    return null
  }

  const handleAccept = (kind: 'photo' | 'doodle') => {
    prevExpiresAtRef.current = pet.lifeExpiresAt ?? null
    setProofKind(kind)
    setPhase('challenge')
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
      // 成功反馈（secondary）
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
    // 重置内部状态（下次打开从 intro 开始）
    setPhase('intro')
    setSubmitResp(null)
    setProofKind(null)
    onClose()
  }

  const handleResultRetry = () => {
    // P1 reroll 接口尚未接入；当前 RejectLayer 内实际按钮隐藏。
    // 保留此回调占位，接入后回 intro 加载新 task。
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
      {/* 宠物图 breathe */}
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
