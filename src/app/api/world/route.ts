import { NextResponse } from 'next/server'
import { computeWorld } from '@/lib/game/world'

export async function GET() {
  try {
    const world = await computeWorld()
    return NextResponse.json(world)
  } catch (err) {
    console.error('[/api/world] error:', err)
    return NextResponse.json({ dayCount: 1, petCount: 0, totalHp: 0 })
  }
}
