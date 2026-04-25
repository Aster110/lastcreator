'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TaskEntryCard from '@/components/ui/TaskEntryCard'
import TaskStage from '@/components/ui/TaskStage'
import TaskHistoryList from '@/components/ui/TaskHistoryList'
import ShareActions from '@/components/ui/ShareActions'
import Countdown from '@/components/ui/Countdown'
import HeaderMenu, { type HeaderMenuItem } from '@/components/ui/HeaderMenu'
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
  /** v3.5: /me 唯一活宠，由 SSR 分流保证 status='alive' */
  pet: FullPet
}

/**
 * v3.5: 活宠任务主场。
 * 取代了旧的 /me/[id]/client 活宠逻辑 + /me 的 GalleryGrid 列表。
 *
 * 用户进来就看到这只宠物 + 任务入口卡（hero），其他属性/故事次要。
 * 完成任务后 onCompleted 原子更新 hp/exp/lifeExpiresAt（修 #4 bug）。
 */
export default function ActivePetScreen({ pet: initialPet }: Props) {
  const [pet, setPet] = useState(initialPet)
  const [stageOpen, setStageOpen] = useState(false)
  const [expBump, setExpBump] = useState(0) // 递增计数器触发 flyUp 动画重放
  const router = useRouter()
  const { data: tasks, loading, refresh, applyReroll } = usePetTasks(pet.id, true)
  const { release, releasing } = usePetActions(pet.id)

  // v3.5 修 #4：结果幕关闭时一次性写入 state，倒计时立即反映新值
  const handleCompleted = (next: { hp: number; exp: number; lifeExpiresAt: number | null }) => {
    setPet(p => ({ ...p, hp: next.hp, exp: next.exp, lifeExpiresAt: next.lifeExpiresAt }))
    setExpBump(n => n + 1) // 触发 EXP 飞字 ← 修 #5
    void refresh()
  }

  // v3.8: 换一个任务
  const handleReroll = async (currentTaskId: string) => {
    const r = await fetch(`/api/tasks/${currentTaskId}/reroll`, { method: 'POST' })
    if (!r.ok) {
      throw new Error(`reroll ${r.status}`)
    }
    const j = (await r.json()) as { task: import('@/types/task').DisplayTask; remainingRerolls: number }
    applyReroll(j.task, j.remainingRerolls)
  }

  const handleRelease = async () => {
    const status = await release()
    if (status) {
      // 放生成功 → SSR 重新分流（→ EmptyNestScreen）
      router.refresh()
    }
  }

  const bgUrl = pet.element ? ELEMENT_BG[pet.element] : '/daily-bg.jpg'
  const birthDate = new Date(pet.createdAt)
  const birthDateStr = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`

  // v3.6: HeaderMenu items（取代旧的 ManageSheet + 右上"图鉴"链接）
  const menuItems: HeaderMenuItem[] = [
    { label: COPY.menu.myHistory, href: '/me/history' },
    { label: COPY.menu.gallery, href: '/gallery' },
    {
      label: COPY.menu.release,
      tone: 'danger',
      confirmText: COPY.manage.releaseConfirm(pet.name),
      onClick: handleRelease,
    },
  ]

  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        >
          ←
        </Link>
        <h1 className="text-white text-sm tracking-widest [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">{pet.name}</h1>
        <HeaderMenu items={menuItems} />
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pb-24 space-y-5">
        {/* 宠物图 */}
        <div className="w-48 h-48 rounded-2xl bg-gray-800 overflow-hidden mx-auto">
          {pet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-white">🐾</div>
          )}
        </div>

        {/* 倒计时 + 出生 */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white text-[10px] tracking-widest uppercase mb-0.5">{COPY.pet.lifeRemainingLabel}</p>
            <Countdown
              expiresAt={pet.lifeExpiresAt}
              status={pet.status}
              variant="hero"
              onExpire={() => router.refresh()}
              staticLabel=""
            />
            {tasks && (
              <p className="text-white text-[10px] mt-1">
                {COPY.pet.lifeRefillHint(tasks.dailyDone, tasks.dailyMax)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-white text-[10px] tracking-widest uppercase mb-0.5">诞生于</p>
            <p className="text-white text-xs tabular-nums">{birthDateStr}</p>
          </div>
        </div>

        {/* v3.6: 分享 CTA 前置到 hero 附近 */}
        <ShareActions petId={pet.id} petName={pet.name} story={pet.story} className="w-full" />

        {/* 任务入口卡 —— v3.5 hero 等级 */}
        <div>
          <p className="text-white text-xs mb-2">当前任务</p>
          {loading || !tasks ? (
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-4 text-white text-xs">
              加载中...
            </div>
          ) : (
            <TaskEntryCard
              task={tasks.active}
              dailyDone={tasks.dailyDone}
              dailyMax={tasks.dailyMax}
              element={pet.element ?? null}
              remainingRerolls={tasks.remainingRerolls}
              maxRerolls={tasks.maxRerolls}
              onOpen={() => setStageOpen(true)}
            />
          )}
        </div>

        {/* 基础属性 */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3 space-y-1.5 text-sm">
          <Row label="栖息地" value={pet.habitat} />
          <Row label="性格" value={pet.personality} />
          <Row label="阶段" value={pet.stage} />
          <ExpRow value={pet.exp} bump={expBump} />
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

        {/* 任务履历 */}
        {tasks && tasks.history && tasks.history.length > 0 && (
          <div>
            <p className="text-white text-xs mb-2">任务履历（{tasks.history.length}）</p>
            <TaskHistoryList tasks={tasks.history} />
          </div>
        )}

        {/* 原涂鸦 */}
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

        {/* 诞生故事 */}
        <div>
          <p className="text-white text-xs mb-2">诞生故事</p>
          <p className="text-white text-sm leading-relaxed">{pet.story}</p>
        </div>

        {releasing && (
          <p className="text-center text-white/50 text-xs pt-2">{COPY.manage.releaseRunning}</p>
        )}
      </div>

      {/* 任务剧场 */}
      <TaskStage
        open={stageOpen}
        petId={pet.id}
        task={tasks?.active ?? null}
        pet={pet}
        onClose={() => setStageOpen(false)}
        onCompleted={handleCompleted}
        remainingRerolls={tasks?.remainingRerolls}
        onReroll={handleReroll}
      />
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

/** v3.5 修 #5：EXP 变化时显示 +N 飞字 */
function ExpRow({ value, bump }: { value: number; bump: number }) {
  // bump 递增时 key 变，anim-fly-up 重放
  return (
    <div className="flex justify-between items-center relative">
      <span className="text-white">EXP</span>
      <div className="relative">
        <span className="text-white tabular-nums font-semibold">{value}</span>
        {bump > 0 && (
          <span
            key={`bump-${bump}`}
            className="absolute right-0 top-0 text-emerald-300 text-xs font-semibold anim-fly-up pointer-events-none"
            aria-hidden
          >
            +
          </span>
        )}
      </div>
    </div>
  )
}
