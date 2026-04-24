'use client'
import DrawingCanvas from '@/features/draw/DrawingCanvas'

interface Props {
  onSubmit: (dataUrl: string) => void
  onCancel: () => void
}

/**
 * 涂鸦 proof：复用现有 DrawingCanvas（已支持 touch+mouse）
 */
export default function DoodleProof({ onSubmit, onCancel }: Props) {
  return <DrawingCanvas onConfirm={onSubmit} onCancel={onCancel} />
}
