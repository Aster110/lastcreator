'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TaskPanel from '@/components/ui/TaskPanel'
import ShareActions from '@/components/ui/ShareActions'
import TaskHistoryList from '@/components/ui/TaskHistoryList'
import Countdown from '@/components/ui/Countdown'
import { usePetTasks } from '@/hooks/usePetTasks'
import { usePetActions } from '@/hooks/usePetActions'
import { COPY } from '@/lib/copy/hints'
import type { ElementId, FullPet } from '@/types/pet'

const ELEMENT_BG: Record<ElementId, string> = {
  ruins: '/bg/ruins.jpg',
  fire: '/bg/fire.jpg',
  water: '/bg/water.jpg',
  ice: '/bg/ice.jpg',
  dark: '/bg/dark.jpg',
  sky: '/bg/sky.jpg',
}

interface Props {
  pet: FullPet
}

export default function MePetDetailClient({ pet: initialPet }: Props) {
  const [pet, setPet] = useState(initialPet)
  const router = useRouter()
  const { data: tasks, loading, refresh } = usePetTasks(pet.id, pet.status === 'alive')
  const { release, releasing } = usePetActions(pet.id)

  const handleCompleted = (state: { hp: number; exp: number }) => {
    // v3.2：状态以 refresh 为准（refresh 会重新算 life_expires_at）
    setPet(p => ({ ...p, hp: state.hp, exp: state.exp }))
    void refresh()
  }

  const handleRelease = async () => {
    if (!confirm(`确认要放生 ${pet.name} 吗？放生后不能召回。`)) return
    const newStatus = await release()
    if (newStatus) {
      setPet(p => ({ ...p, status: newStatus }))
    }
  }

  const birthDate = new Date(pet.createdAt)
  const birthDateStr = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`
  const bgUrl = pet.element ? ELEMENT_BG[pet.element] : '/daily-bg.jpg'

  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      {/* 暗色遮罩：统一反差 */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <Link href="/me" className="w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          ←
        </Link>
        <h1 className="text-white text-sm tracking-widest [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">{pet.name}</h1>
        <div className="w-10" />
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pb-10 space-y-5">
        {/* 宠物图 */}
        <div className="w-48 h-48 rounded-2xl bg-gray-800 overflow-hidden mx-auto">
          {pet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-white">🐾</div>
          )}
        </div>

        {/* 倒计时 + 出生时间 */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white text-[10px] tracking-widest uppercase mb-0.5">{COPY.pet.lifeRemainingLabel}</p>
            <Countdown
              expiresAt={pet.lifeExpiresAt}
              status={pet.status}
              variant="hero"
              onExpire={() => router.refresh()}
              staticLabel={pet.status === 'released' ? COPY.pet.released : pet.status === 'dead' ? COPY.pet.deceased : ''}
            />
            {pet.status === 'alive' && (
              <p className="text-white text-[10px] mt-1">{COPY.pet.lifeRefillHint}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-white text-[10px] tracking-widest uppercase mb-0.5">诞生于</p>
            <p className="text-white text-xs tabular-nums">{birthDateStr}</p>
          </div>
        </div>

        {/* 基础属性 */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3 space-y-1.5 text-sm">
          <Row label="栖息地" value={pet.habitat} />
          <Row label="性格" value={pet.personality} />
          <Row label="阶段" value={pet.stage} />
          <Row label="EXP" value={String(pet.exp)} highlight />
          {pet.mood && <Row label="情绪" value={pet.mood} />}
        </div>

        {/* 技能 */}
        <div>
          <p className="text-white text-xs mb-2">技能</p>
          <div className="flex flex-wrap gap-2">
            {pet.skills.map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-gray-800/80 text-white text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 任务面板 / 非活状态提示 */}
        {pet.status === 'alive' ? (
          <div>
            <p className="text-white text-xs mb-2">当前任务</p>
            {loading || !tasks ? (
              <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-4 text-white text-xs">
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
        ) : (
          <div className="rounded-2xl bg-gray-900/40 border border-gray-800 px-4 py-3 text-center">
            <p className="text-white text-xs">
              {pet.status === 'released' ? '🕊️ 已放生，自由地生活在末日' : '🕯️ 已安息'}
            </p>
          </div>
        )}

        {/* 任务履历 */}
        {tasks && tasks.history && tasks.history.length > 0 && (
          <div>
            <p className="text-white text-xs mb-2">任务履历（{tasks.history.length}）</p>
            <TaskHistoryList tasks={tasks.history} />
          </div>
        )}

        {/* 原涂鸦（只有 owner 能看） */}
        {pet.doodleR2Key && (
          <div>
            <p className="text-white text-xs mb-2">你画的那一笔</p>
            <div className="w-full aspect-square rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://media.lastcreator.cc/${pet.doodleR2Key}`}
                alt="doodle"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* 故事 */}
        <div>
          <p className="text-white text-xs mb-2">诞生故事</p>
          <p className="text-white text-sm leading-relaxed">{pet.story}</p>
        </div>

        {/* 分享 + 放生 */}
        <div className="pt-2 space-y-2">
          <ShareActions petId={pet.id} petName={pet.name} story={pet.story} className="w-full" />
          {pet.status === 'alive' && (
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="w-full h-12 rounded-full bg-gray-900 border border-gray-800 text-white text-sm active:scale-95 transition-transform disabled:opacity-40"
            >
              {releasing ? '放生中...' : '🕊️ 放生'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-white">{label}</span>
      <span className={highlight ? 'text-white tabular-nums font-semibold' : 'text-white'}>{value}</span>
    </div>
  )
}
