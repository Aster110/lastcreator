import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { readUser } from '@/lib/identity'
import { getFullPet } from '@/lib/repo/petState'
import { countAliveByOwner } from '@/lib/repo/pets'
import { listByPet } from '@/lib/repo/memories'
import MePetDetailClient from './client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * v3.5 /me/[id]：
 * - alive → redirect('/me')（活宠唯一入口是 /me）
 * - released/dead → 墓碑只读模式
 * - 非 owner → 跳 /p/[id] 公开页
 */
export default async function MePetDetailPage({ params }: PageProps) {
  const { id } = await params
  if (!id?.startsWith('p_')) notFound()

  const user = await readUser()
  const pet = await getFullPet(id)

  if (!pet) notFound()
  if (!user || pet.ownerId !== user.userId) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-gray-500 text-sm text-center">
          这只宠物不属于你，<br />请从公开页面查看
        </p>
        <Link
          href={`/p/${id}`}
          className="h-12 px-6 rounded-full bg-white text-gray-900 text-sm font-semibold flex items-center"
        >
          去公开页 →
        </Link>
      </div>
    )
  }

  // v3.5: 活宠统一走 /me
  if (pet.status === 'alive') {
    redirect('/me')
  }

  // 墓碑模式：SSR 预取"当前有无活宠"，决定是否显示"召唤新的一只" CTA
  const aliveCount = await countAliveByOwner(user.userId)
  const canSummonNext = aliveCount === 0

  // v3.9.3: 取该宠物的"它的一生"叙事（subscriber 异步生成；未生成时返 null）
  const memories = await listByPet(pet.id, 50)
  const narrativeMem = memories.find(m => m.kind === 'narrative')
  const narrative =
    narrativeMem && narrativeMem.payload.kind === 'narrative'
      ? {
          title: narrativeMem.payload.title,
          body: narrativeMem.payload.body,
          cause: narrativeMem.payload.cause,
        }
      : null

  return <MePetDetailClient pet={pet} canSummonNext={canSummonNext} narrative={narrative} />
}
