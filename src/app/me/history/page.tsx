import Link from 'next/link'
import { readUser } from '@/lib/identity'
import { listFullPetsByOwner } from '@/lib/repo/petState'
import { countDoneTasksForPet } from '@/lib/repo/tasks'
import GalleryGrid from '@/components/ui/GalleryGrid'
import { COPY } from '@/lib/copy/hints'
import type { DisplayPet } from '@/types/pet'

export const dynamic = 'force-dynamic'

/**
 * v3.6: 我的墓碑列表
 * - owner 的非 alive 宠物（released / dead）
 * - 复用 GalleryGrid 组件，linkPrefix='/me'（点进去 /me/[id] 墓碑页）
 */
export default async function MyHistoryPage() {
  const user = await readUser()
  const allPets = user ? await listFullPetsByOwner(user.userId, { limit: 200 }) : []
  const historyPets = allPets.filter(p => p.status !== 'alive')
  const counts = await Promise.all(historyPets.map(p => countDoneTasksForPet(p.id)))
  const display: DisplayPet[] = historyPets.map((p, i) => ({
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
    element: p.element ?? null,
  }))

  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: 'url(/daily-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />

      <div className="relative flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <Link
          href="/me"
          className="w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        >
          ←
        </Link>
        <h1 className="text-white text-base tracking-widest [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          {COPY.menu.historyPageTitle}
        </h1>
        <div className="w-10" />
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pb-10">
        {display.length === 0 ? (
          <div className="text-center py-20 text-white/70 text-sm">
            {COPY.menu.historyEmpty}
          </div>
        ) : (
          <GalleryGrid pets={display} linkPrefix="/me" />
        )}
      </div>
    </div>
  )
}
