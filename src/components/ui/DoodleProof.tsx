'use client'
import DrawingCanvas from '@/features/draw/DrawingCanvas'

interface Props {
  onSubmit: (dataUrl: string) => void
  onCancel: () => void
  /** 顶部提示文案（如 "画：{task.prompt}"） */
  hint?: string
}

/**
 * 涂鸦 proof：复用 DrawingCanvas 的画布能力，任务场景文案由 hint 注入
 */
export default function DoodleProof({ onSubmit, onCancel, hint }: Props) {
  return <DrawingCanvas onConfirm={onSubmit} onCancel={onCancel} hint={hint} />
}
