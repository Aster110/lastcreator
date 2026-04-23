'use client'
import { useState } from 'react'
import HomeScreen from '@/components/HomeScreen'
import DrawingCanvas from '@/components/DrawingCanvas'
import LoadingScreen from '@/components/LoadingScreen'
import PetCard from '@/components/PetCard'
import type { Pet } from '@/types/pet'

type Phase = 'home' | 'drawing' | 'loading' | 'result'

export default function Home() {
  const [phase, setPhase] = useState<Phase>('home')
  const [pet, setPet] = useState<Pet | null>(null)

  const handleConfirm = async (dataUrl: string) => {
    setPhase('loading')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      })
      const data = await res.json() as { pet: Pet; imageUrl: string | null; fallback?: boolean }
      const { pet: p, imageUrl, fallback } = data
      console.log('[generate] imageUrl:', imageUrl, 'fallback:', fallback)
      setPet({ ...p, imageUrl: imageUrl ?? undefined })
    } catch {
      setPet({
        id: crypto.randomUUID(),
        name: '神秘生命体',
        habitat: '末日废墟',
        personality: '神秘而古老',
        skills: ['虚空凝视', '时间感知', '意志具现'],
        hp: 100,
        story: '它从你的笔触中诞生，带着世界最后的记忆。',
      })
    }
    setPhase('result')
  }

  if (phase === 'drawing') {
    return <DrawingCanvas onConfirm={handleConfirm} onCancel={() => setPhase('home')} />
  }
  if (phase === 'loading') {
    return <LoadingScreen />
  }
  if (phase === 'result' && pet) {
    return <PetCard pet={pet} onReset={() => setPhase('home')} />
  }
  return <HomeScreen onStart={() => setPhase('drawing')} />
}
