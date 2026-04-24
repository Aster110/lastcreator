'use client'
import { useState } from 'react'
import HomeScreen from '@/features/home-new/NewHomeScreen'
import DrawingCanvas from '@/features/draw/DrawingCanvas'
import LoadingScreen from '@/features/draw/LoadingScreen'
import PetCard from '@/components/ui/PetCard'
import type { DisplayPet } from '@/types/pet'

type Phase = 'home' | 'drawing' | 'loading' | 'result'

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

export default function Home() {
  const [phase, setPhase] = useState<Phase>('home')
  const [pet, setPet] = useState<DisplayPet | null>(null)

  const handleConfirm = async (dataUrl: string) => {
    setPhase('loading')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      })
      const data = (await res.json()) as { pet: DisplayPet; fallback?: boolean }
      console.log('[generate] pet:', data.pet.id, 'fallback:', data.fallback)
      setPet(data.pet)
    } catch (err) {
      console.error('[generate] network error:', err)
      setPet(FALLBACK)
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
