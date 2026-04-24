'use client'
import { useState } from 'react'
import DrawFlow from '@/features/draw/DrawFlow'
import TaskPanel from '@/components/ui/TaskPanel'
import HomePetHeader from './HomePetHeader'
import HomePetHero from './HomePetHero'
import HomePetActions from './HomePetActions'
import { usePetTasks } from '@/hooks/usePetTasks'
import { petViewFromFullPet } from '@/lib/view/petView'
import type { FullPet } from '@/types/pet'
import type { WorldState } from '@/lib/game/world'

interface Props {
  pet: FullPet
  world: WorldState
  currentUserId: string
}

/**
 * 有活宠老用户的首屏。
 * 布局（§10-前端架构 §5 D6）：Header / Hero / TaskPanel / Actions。
 */
export default function HomePetScreen({ pet: initialPet, world, currentUserId }: Props) {
  const [pet, setPet] = useState(initialPet)
  const [drawing, setDrawing] = useState(false)
  const { data: tasks, loading, refresh } = usePetTasks(pet.id, pet.status === 'alive')

  if (drawing) {
    return <DrawFlow open onClose={() => setDrawing(false)} />
  }

  const view = petViewFromFullPet(pet, { currentUserId })

  const handleCompleted = (state: { hp: number; exp: number }) => {
    setPet(p => ({ ...p, hp: state.hp, exp: state.exp }))
    void refresh()
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col px-6 pt-10 pb-8 overflow-hidden">
      <HomePetHeader world={world} />

      <div className="flex-1 overflow-y-auto mt-6 space-y-6">
        <HomePetHero pet={view} />

        {/* 任务 */}
        <div>
          <p className="text-gray-600 text-xs mb-2 tracking-wider">当前任务</p>
          {loading || !tasks ? (
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-4 text-gray-600 text-xs">
              加载中...
            </div>
          ) : (
            <TaskPanel
              petId={pet.id}
              task={tasks.active}
              dailyDone={tasks.dailyDone}
              dailyMax={tasks.dailyMax}
              onCompleted={handleCompleted}
            />
          )}
        </div>
      </div>

      <div className="pt-4 shrink-0">
        <HomePetActions petId={pet.id} onDraw={() => setDrawing(true)} />
      </div>
    </div>
  )
}
