import { NextResponse } from 'next/server'
import { getPet } from '@/lib/repo/pets'
import type { DisplayPet } from '@/types/pet'

/**
 * 单只宠物查询。公开可访问（用于分享页 /p/[id] + 自己的详情页）
 * 返回 DisplayPet：过滤掉 owner/内部字段
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
    const pet = await getPet(id)
    if (!pet) return NextResponse.json({ error: 'not found' }, { status: 404 })
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
      createdAt: pet.createdAt,
    }
    return NextResponse.json({ pet: display })
  } catch (err) {
    console.error('[/api/pets/[id]] error:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
