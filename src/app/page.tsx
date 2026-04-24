import { readUser } from '@/lib/identity'
import { listFullPetsByOwner } from '@/lib/repo/petState'
import { countDoneTasksForPet } from '@/lib/repo/tasks'
import { computeWorld } from '@/lib/game/world'
import { decideHome } from '@/lib/routing/decideHome'
import NewHomeScreen from '@/features/home-new/NewHomeScreen'
import HomePetScreen from '@/features/home-pet/HomePetScreen'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const user = await readUser()
  const [pets, world] = await Promise.all([
    user ? listFullPetsByOwner(user.userId, { limit: 10 }) : Promise.resolve([]),
    computeWorld(),
  ])
  const decision = decideHome({ user, pets })

  if (decision.kind === 'pet') {
    const completedCount = await countDoneTasksForPet(decision.pet.id)
    return (
      <HomePetScreen
        pet={decision.pet}
        world={world}
        currentUserId={user!.userId}
        completedCount={completedCount}
      />
    )
  }

  return <NewHomeScreen world={world} hasArchive={decision.kind === 'empty'} />
}
