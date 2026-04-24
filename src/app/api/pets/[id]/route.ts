import { NextResponse } from 'next/server'
import { getFullPet } from '@/lib/repo/petState'
import { countDoneTasksForPet } from '@/lib/repo/tasks'
import type { DisplayPet } from '@/types/pet'

/**
 * 单只宠物查询。公开可访问（用于分享页 /p/[id] + 自己的详情页）
 * v3.2：用 getFullPet 拿完整状态（含 lifeExpiresAt），经过懒检查
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id || !id.startsWith('p_')) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }
  try {
    const pet = await getFullPet(id)
    if (!pet) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const completedTaskCount = await countDoneTasksForPet(id)
    const display: DisplayPet = {
      id: pet.id,
      name: pet.name,
      habitat: pet.habitat,
      personality: pet.personality,
      skills: pet.skills,
      hp: pet.hp,
      story: pet.story,
      imageUrl: pet.imageUrl,
      stage: pet.stage,
      status: pet.status,
      createdAt: pet.createdAt,
      lifeExpiresAt: pet.lifeExpiresAt,
      completedTaskCount,
    }
    return NextResponse.json({ pet: display })
  } catch (err) {
    console.error('[/api/pets/[id]] error:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
