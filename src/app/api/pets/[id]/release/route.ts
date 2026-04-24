import { NextResponse } from 'next/server'
import { ensureSubscribers } from '@/lib/events/subscribers'
import { resolveUser } from '@/lib/identity'
import { getFullPet } from '@/lib/repo/petState'
import { patchPetState } from '@/lib/repo/petState'
import { emit } from '@/lib/events'

/**
 * POST /api/pets/:id/release
 * 放生宠物：status 从 alive 切到 released，emit pet.released 供订阅者做后续（v3.1 记忆写入）
 * 仅 owner、仅 alive 状态可放生
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureSubscribers()
  const { id } = await params
  if (!id?.startsWith('p_')) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }
  try {
    const { userId } = await resolveUser()
    const pet = await getFullPet(id)
    if (!pet) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (pet.ownerId !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (pet.status !== 'alive') {
      return NextResponse.json({ error: `pet is ${pet.status}, cannot release` }, { status: 409 })
    }

    const newState = await patchPetState(id, { status: 'released' })
    emit({ type: 'pet.released', petId: id, at: Date.now() })

    return NextResponse.json({ state: newState })
  } catch (err) {
    console.error('[/api/pets/[id]/release]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
