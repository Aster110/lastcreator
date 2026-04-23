'use client'
import { useState } from 'react'
import HomeScreen from '@/components/HomeScreen'
import DrawingCanvas from '@/components/DrawingCanvas'
import LoadingScreen from '@/components/LoadingScreen'
import PetCard from '@/components/PetCard'
import type { Pet } from '@/types/pet'

type Phase = 'home' | 'drawing' | 'loading' | 'result'

const MOCK_PET: Pet = {
  id: 'mock-1',
  name: '烈焰球兽',
  habitat: '火域深渊',
  personality: '暴躁但忠诚',
  skills: ['火焰冲击', '熔岩护盾', '爆裂突进'],
  hp: 100,
  story: '它诞生于世界燃尽后的第一缕火焰，守护着最后的幸存者。',
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('home')
  const [pet, setPet] = useState<Pet | null>(null)

  const handleConfirm = async (dataUrl: string) => {
    setPhase('loading')
    // TODO: 接 /api/generate
    await new Promise(r => setTimeout(r, 3000))
    setPet(MOCK_PET)
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
