import { NextResponse } from 'next/server'
import { resolveUser } from '@/lib/identity'
import { listPetsByOwner } from '@/lib/repo/pets'
import type { DisplayPet } from '@/types/pet'

export async function GET() {
  try {
    const { userId } = await resolveUser()
    const pets = await listPetsByOwner(userId, { limit: 200 })
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
    return NextResponse.json({ pets: display })
  } catch (err) {
    console.error('[/api/pets] error:', err)
    return NextResponse.json({ pets: [], error: 'internal' }, { status: 500 })
  }
}
