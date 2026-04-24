'use client'
import { useState } from 'react'
import DrawingCanvas from './DrawingCanvas'
import LoadingScreen from './LoadingScreen'
import PetCard from '@/components/ui/PetCard'
import type { DisplayPet } from '@/types/pet'

type Phase = 'drawing' | 'loading' | 'result'

interface Props {
  /** 开关（父组件控制是否展示整个流程） */
  open: boolean
  /** 整个流程退出（用户取消 / 点击"再召唤一只"）*/
  onClose: () => void
}

const FALLBACK: DisplayPet = {
  id: 'local-fallback',
  name: '神秘生命体',
  habitat: '末日废墟',
  personality: '神秘而古老',
  skills: ['虚空凝视', '时间感知', '意志具现'],
  hp: 100,
  story: '它从你的笔触中诞生，带着世界最后的记忆。',
  imageUrl: null,
}

/**
 * 召唤流程子状态机（drawing → loading → result）。
 * 新用户首屏 / 老用户主宠屏点"再画一只"都内嵌这个组件。
 */
export default function DrawFlow({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('drawing')
  const [pet, setPet] = useState<DisplayPet | null>(null)

  if (!open) return null

  const handleConfirm = async (dataUrl: string) => {
    setPhase('loading')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      })
      const data = (await res.json()) as { pet: DisplayPet; fallback?: boolean }
      setPet(data.pet)
    } catch (err) {
      console.error('[generate] network error:', err)
      setPet(FALLBACK)
    }
    setPhase('result')
  }

  const handleReset = () => {
    setPhase('drawing')
    setPet(null)
    onClose()
  }

  if (phase === 'drawing') {
    return <DrawingCanvas onConfirm={handleConfirm} onCancel={onClose} />
  }
  if (phase === 'loading') {
    return <LoadingScreen />
  }
  if (phase === 'result' && pet) {
    return <PetCard pet={pet} onReset={handleReset} />
  }
  return null
}
