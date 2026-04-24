import Link from 'next/link'
import { readUser } from '@/lib/identity'
import { listFullPetsByOwner } from '@/lib/repo/petState'
import { countDoneTasksForPet } from '@/lib/repo/tasks'
import { computeWorld } from '@/lib/game/world'
import GalleryGrid from '@/components/ui/GalleryGrid'
import WelcomeOverlay from '@/components/ui/WelcomeOverlay'
import type { DisplayPet, FullPet } from '@/types/pet'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ welcome?: string }>
}

export default async function MePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const user = await readUser()
  const [pets, world] = await Promise.all([
    user ? listFullPetsByOwner(user.userId, { limit: 200 }) : Promise.resolve([] as FullPet[]),
    computeWorld(),
  ])
  // v3.2：并行预取每只宠物的 done 任务数
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
      className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: 'url(/daily-bg.jpg)' }}
    >
      {/* 暗色遮罩：统一反差 */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      <div className="relative flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        >
          ←
        </Link>
        <h1 className="text-white text-base tracking-widest [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">末日档案</h1>
        <Link
          href="/gallery"
          className="text-white text-sm px-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        >
          图鉴
        </Link>
      </div>

      <div className="relative px-5 pb-4 shrink-0">
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-white text-xs tracking-widest uppercase">末日第</p>
              <p className="text-white text-3xl font-bold tabular-nums mt-0.5">
                {world.dayCount}
                <span className="text-white text-sm font-normal ml-1">天</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-white text-xs">复苏进度</p>
              <p className="text-white text-lg tabular-nums">{world.totalHp}</p>
              <p className="text-white text-xs">{world.petCount} 个生命</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pb-24">
        <GalleryGrid pets={display} />
      </div>

      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none">
        <Link
          href="/draw"
          className="flex items-center justify-center w-full h-14 rounded-full bg-white text-gray-900 font-semibold text-base active:scale-95 transition-transform pointer-events-auto"
        >
          + 召唤新生命
        </Link>
      </div>

      <WelcomeOverlay pet={sp.welcome === '1' ? (display.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] ?? null) : null} />
    </div>
  )
}
