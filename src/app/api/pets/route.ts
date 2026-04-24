import { NextResponse } from 'next/server'
import { resolveUser } from '@/lib/identity'
import { listFullPetsByOwner } from '@/lib/repo/petState'
import { countDoneTasksForPet } from '@/lib/repo/tasks'
import type { DisplayPet } from '@/types/pet'

export async function GET() {
  try {
    const { userId } = await resolveUser()
    const pets = await listFullPetsByOwner(userId, { limit: 200 })
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
    return NextResponse.json({ pets: display })
  } catch (err) {
    console.error('[/api/pets] error:', err)
    return NextResponse.json({ pets: [], error: 'internal' }, { status: 500 })
  }
}
