'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import ShareActions from '@/components/ui/ShareActions'
import TaskHistoryList from '@/components/ui/TaskHistoryList'
import HeaderMenu, { type HeaderMenuItem } from '@/components/ui/HeaderMenu'
import BackButton from '@/components/ui/BackButton'
import TombstoneShareCard from '@/components/ui/TombstoneShareCard'
import { COPY } from '@/lib/copy/hints'
import type { ElementId, FullPet } from '@/types/pet'
import type { DisplayTask } from '@/types/task'

const ELEMENT_BG: Record<ElementId, string> = {
  ruins: '/bg/ruins.jpg',
  fire: '/bg/fire.jpg',
  water: '/bg/water.jpg',
  ice: '/bg/ice.jpg',
  dark: '/bg/dark.jpg',
  sky: '/bg/sky.jpg',
}

interface Props {
  /** v3.5: 仅用于非 alive 宠物。alive 的在 page.tsx 被 redirect 到 /me */
  pet: FullPet
  /** 调用者当前是否无活宠，决定"召唤新的一只" CTA 是否显示 */
  canSummonNext: boolean
  /** v3.9.3: AI 生成的"它的一生"叙事；subscriber 异步生成，未生成时为 null */
  narrative: { title: string; body: string; cause: 'died' | 'released' } | null
}

/**
 * v3.5: 墓碑只读页。
 * 展示已放生 / 已安息宠物的"活过的证据"：属性/故事/涂鸦/任务履历。
 * 无 TaskStage 入口、无放生按钮。
 */
export default function MePetDetailClient({ pet, canSummonNext, narrative }: Props) {
  const [history, setHistory] = useState<DisplayTask[]>([])
  const bgUrl = pet.element ? ELEMENT_BG[pet.element] : '/daily-bg.jpg'

  useEffect(() => {
    // 读取任务历史（复用现有 /api/pets/[id]/tasks，它对非 alive 宠物也返 history）
    let cancel = false
    void fetch(`/api/pets/${pet.id}/tasks`)
      .then(r => r.json() as Promise<{ history?: DisplayTask[] }>)
      .then(j => {
        if (!cancel && j.history) setHistory(j.history)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [pet.id])

  const birthDate = new Date(pet.createdAt)
  const birthDateStr = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`

  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      {/* 墓碑遮罩加重 */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <BackButton
          fallback="/me"
          label="←"
          className="w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        />
        <h1 className="text-white text-sm tracking-widest [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          {pet.name}
        </h1>
        <HeaderMenu
          items={[
            { label: COPY.menu.backHome, href: '/me' },
            { label: COPY.menu.myHistory, href: '/me/history' },
          ] as HeaderMenuItem[]}
        />
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pb-10 space-y-5">
        {/* 剪影：灰阶 + opacity */}
        <div className="w-48 h-48 rounded-2xl bg-gray-800 overflow-hidden mx-auto grayscale opacity-75">
          {pet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-white">🐾</div>
          )}
        </div>

        {/* 状态标签 */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3 flex items-center justify-between">
          <p className="text-white text-sm">
            {pet.status === 'released' ? COPY.pet.released : COPY.pet.deceased}
          </p>
          <div className="text-right">
            <p className="text-white/70 text-[10px] tracking-widest uppercase">诞生于</p>
            <p className="text-white text-xs tabular-nums">{birthDateStr}</p>
          </div>
        </div>

        {/* v3.9.3: AI 生成的"它的一生"叙事（subscriber 异步生成；未到位时短暂占位）*/}
        {narrative ? (
          <TombstoneShareCard
            title={narrative.title}
            body={narrative.body}
            cause={narrative.cause}
          />
        ) : (
          <div className="rounded-2xl bg-black/50 border border-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-white/55 text-xs">
              {pet.status === 'released' ? '🕊️ 它回到了风里…' : '🕯️ 它正在被记起…'}
            </p>
            <p className="text-white/40 text-[11px] mt-1">
              （叙事生成中，稍后刷新可看）
            </p>
          </div>
        )}

        {/* 基础属性（只读） */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3 space-y-1.5 text-sm">
          <Row label="栖息地" value={pet.habitat} />
          <Row label="性格" value={pet.personality} />
          <Row label="阶段" value={pet.stage} />
          <Row label="EXP" value={String(pet.exp)} />
        </div>

        {/* 技能 */}
        <div>
          <p className="text-white/80 text-xs mb-2">技能</p>
          <div className="flex flex-wrap gap-2">
            {pet.skills.map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-gray-800/80 text-white/90 text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 任务履历（活过的证据） */}
        {history.length > 0 && (
          <div>
            <p className="text-white/80 text-xs mb-2">{COPY.tombstone.livedHeader}（{history.length}）</p>
            <TaskHistoryList tasks={history} />
          </div>
        )}

        {/* 原涂鸦 */}
        {pet.doodleR2Key && (
          <div>
            <p className="text-white/80 text-xs mb-2">你画的那一笔</p>
            <div className="w-full aspect-square rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://media.lastcreator.cc/${pet.doodleR2Key}`}
                alt="doodle"
                className="w-full h-full object-contain grayscale opacity-80"
              />
            </div>
          </div>
        )}

        {/* 诞生故事 */}
        <div>
          <p className="text-white/80 text-xs mb-2">诞生故事</p>
          <p className="text-white text-sm leading-relaxed">{pet.story}</p>
        </div>

        {/* 分享 */}
        <div className="pt-2 space-y-2">
          <ShareActions petId={pet.id} petName={pet.name} story={pet.story} className="w-full" />
        </div>

        {/* 召唤下一只（仅当前无活宠时显示） */}
        {canSummonNext ? (
          <Link
            href="/draw"
            className="block w-full h-12 rounded-full bg-white text-gray-900 text-sm font-semibold flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            {COPY.tombstone.summonNextCTA}
          </Link>
        ) : (
          <p className="text-center text-white/50 text-xs pt-2">{COPY.tombstone.noActionHint}</p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/80">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}
