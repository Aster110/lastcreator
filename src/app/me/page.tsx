import { readUser } from '@/lib/identity'
import { listFullPetsByOwner } from '@/lib/repo/petState'
import { countDoneTasksForPet } from '@/lib/repo/tasks'
import { computeWorld } from '@/lib/game/world'
import WelcomeOverlay from '@/components/ui/WelcomeOverlay'
import ActivePetScreen from '@/features/active-pet/ActivePetScreen'
import EmptyNestScreen from '@/features/active-pet/EmptyNestScreen'
import type { DisplayPet, FullPet } from '@/types/pet'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ welcome?: string }>
}

/**
 * v3.5 /me：单宠范式下的"家"。
 * - 有活宠 → 活宠主场（ActivePetScreen） + WelcomeOverlay（若 welcome=1）
 * - 无活宠 + 有历史 → 空巢页 + 最近剪影 + 召唤 CTA
 * - 无活宠 + 无历史 → 空巢页兜底（纯引导）
 */
export default async function MePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const user = await readUser()
  const [pets, world] = await Promise.all([
    user ? listFullPetsByOwner(user.userId, { limit: 200 }) : Promise.resolve([] as FullPet[]),
    computeWorld(),
  ])
  const alive = pets.find(p => p.status === 'alive') ?? null
  const lastPet = pets[0] ?? null  // ORDER BY created_at DESC；alive 通常就是第一只

  if (alive) {
    // 仅为 WelcomeOverlay 构造 DisplayPet；完成任务数给新宠默认 0
    const welcomeDisplay: DisplayPet = {
      id: alive.id,
      name: alive.name,
      habitat: alive.habitat,
      personality: alive.personality,
      skills: alive.skills,
      hp: alive.hp,
      story: alive.story,
      imageUrl: alive.imageUrl,
      stage: alive.stage,
      status: alive.status,
      createdAt: alive.createdAt,
      lifeExpiresAt: alive.lifeExpiresAt,
      completedTaskCount: await countDoneTasksForPet(alive.id),
      element: alive.element ?? null,
    }
    return (
      <>
        <ActivePetScreen pet={alive} />
        {sp.welcome === '1' && <WelcomeOverlay pet={welcomeDisplay} />}
      </>
    )
  }

  const lastDisplay: DisplayPet | null = lastPet
    ? {
        id: lastPet.id,
        name: lastPet.name,
        habitat: lastPet.habitat,
        personality: lastPet.personality,
        skills: lastPet.skills,
        hp: lastPet.hp,
        story: lastPet.story,
        imageUrl: lastPet.imageUrl,
        stage: lastPet.stage,
        status: lastPet.status,
        createdAt: lastPet.createdAt,
        lifeExpiresAt: lastPet.lifeExpiresAt,
        element: lastPet.element ?? null,
      }
    : null

  return <EmptyNestScreen lastPet={lastDisplay} world={world} />
}
