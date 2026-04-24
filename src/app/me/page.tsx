import Link from 'next/link'
import { readUser } from '@/lib/identity'
import { listFullPetsByOwner } from '@/lib/repo/petState'
import { computeWorld } from '@/lib/game/world'
import GalleryGrid from '@/components/ui/GalleryGrid'
import type { DisplayPet, FullPet } from '@/types/pet'

export const dynamic = 'force-dynamic'

export default async function MePage() {
  const user = await readUser()
  const [pets, world] = await Promise.all([
    user ? listFullPetsByOwner(user.userId, { limit: 200 }) : Promise.resolve([] as FullPet[]),
    computeWorld(),
  ])
  // v3: 用 FullPet（merged state），显示最新的 hp/stage/name
  const display: DisplayPet[] = pets.map(p => ({
    id: p.id,
    name: p.name,
    habitat: p.habitat,
    personality: p.personality,
    skills: p.skills,
    hp: p.hp,
    story: p.story,
    imageUrl: p.imageUrl,
    stage: p.stage,
    createdAt: p.createdAt,
  }))

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center text-gray-500 text-xl"
        >
          ←
        </Link>
        <h1 className="text-gray-200 text-base tracking-widest">末日档案</h1>
        <div className="w-10" />
      </div>

      {/* 世界状态 */}
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
              <p className="text-gray-500 text-xs">复苏进度</p>
              <p className="text-gray-300 text-lg tabular-nums">{world.totalHp}</p>
              <p className="text-gray-600 text-xs">{world.petCount} 个生命</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        <GalleryGrid pets={display} />
      </div>

      {/* 底部新建按钮 */}
      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-6 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
        <Link
          href="/"
          className="flex items-center justify-center w-full h-14 rounded-full bg-white text-gray-900 font-semibold text-base active:scale-95 transition-transform"
        >
          + 召唤新生命
        </Link>
      </div>
    </div>
  )
}
