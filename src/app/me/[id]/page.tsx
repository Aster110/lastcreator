import Link from 'next/link'
import { notFound } from 'next/navigation'
import { readUser } from '@/lib/identity'
import { getFullPet } from '@/lib/repo/petState'
import MePetDetailClient from './client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MePetDetailPage({ params }: PageProps) {
  const { id } = await params
  if (!id?.startsWith('p_')) notFound()

  const user = await readUser()
  const pet = await getFullPet(id)

  // 非 owner 访问 → 重定向到公开页（/p/[id]）
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

  return <MePetDetailClient pet={pet} />
}
