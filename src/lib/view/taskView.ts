import type { DisplayTask, Reward } from '@/types/task'
import type { TaskView } from '@/types/view'

export function taskViewFromDisplay(task: DisplayTask): TaskView {
  return {
    id: task.id,
    kind: task.kind,
    prompt: task.prompt,
    reward: task.reward,
    rewardText: rewardText(task.reward),
    status: task.status,
    verdict: task.aiVerdict ?? null,
    isActive: task.status === 'pending' || task.status === 'submitted',
    expiresAt: task.expiresAt,
  }
}

export function rewardText(r: Reward): string {
  const parts: string[] = []
  if (r.hp) parts.push(`HP +${r.hp}`)
  if (r.exp) parts.push(`EXP +${r.exp}`)
  if (r.mood) parts.push(`情绪 ${r.mood}`)
  if (r.unlockSkill) parts.push('🎁 新技能')
  return parts.join(' · ') || '神秘'
}
