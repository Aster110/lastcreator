import Link from 'next/link'
import { listAllFullPets } from '@/lib/repo/petState'
import { countDoneTasksForPet } from '@/lib/repo/tasks'
import { computeWorld } from '@/lib/game/world'
import GalleryGrid from '@/components/ui/GalleryGrid'
import type { DisplayPet } from '@/types/pet'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const [pets, world] = await Promise.all([
    listAllFullPets({ limit: 200 }),
    computeWorld(),
  ])
  const counts = await Promise.all(pets.map(p => countDoneTasksForPet(p.id)))
  const display: DisplayPet[] = pets.map((p, i) => ({
    id: p.id,
    name: p.name,
    habitat: p.habitat,
    personality: p.personality,
    skills: p.skills,
    hp: p.hp,
    story: p.story,
    imageUrl: p.imageUrl,
    stage: p.stage,
    status: p.status,
    createdAt: p.createdAt,
    lifeExpiresAt: p.lifeExpiresAt,
    completedTaskCount: counts[i],
  }))

  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/daily-bg.jpg)' }}
    >
      <div className="flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center text-gray-500 text-xl"
        >
          ←
        </Link>
        <h1 className="text-gray-200 text-base tracking-widest">世界图鉴</h1>
        <Link
          href="/me"
          className="text-gray-500 text-xs px-2"
        >
          我的
        </Link>
      </div>

      <div className="px-5 pb-4 shrink-0">
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-gray-500 text-xs tracking-widest uppercase">末日第</p>
              <p className="text-white text-3xl font-bold tabular-nums mt-0.5">
                {world.dayCount}
                <span className="text-gray-500 text-sm font-normal ml-1">天</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">全世界复苏</p>
              <p className="text-gray-300 text-lg tabular-nums">{world.totalHp}</p>
              <p className="text-gray-600 text-xs">{world.petCount} 个生命</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        <GalleryGrid pets={display} linkPrefix="/p" />
      </div>

      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
        <Link
          href="/draw"
          className="flex items-center justify-center w-full h-14 rounded-full bg-white text-gray-900 font-semibold text-base active:scale-95 transition-transform"
        >
          + 召唤你的生命
        </Link>
      </div>
    </div>
  )
}
