import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPet } from '@/lib/repo/pets'
import ShareActions from '@/components/ShareActions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  if (!id?.startsWith('p_')) return { title: '未找到 · 神笔' }

  try {
    const pet = await getPet(id)
    if (!pet) return { title: '未找到这只宠物 · 神笔' }

    const title = `${pet.name} · ${pet.habitat}`
    const description = `${pet.personality}｜${pet.skills.join(' · ')}｜${pet.story}`
    return {
      title: `${title} · 神笔`,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: pet.imageUrl, width: 1024, height: 1024, alt: pet.name }],
        type: 'article',
        siteName: '神笔 · LastCreator',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [pet.imageUrl],
      },
    }
  } catch {
    return { title: '神笔' }
  }
}

export default async function PublicPetPage({ params }: PageProps) {
  const { id } = await params
  if (!id?.startsWith('p_')) notFound()

  const pet = await getPet(id)
  if (!pet) notFound()

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col px-6 py-10 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="text-gray-600 text-xs tracking-widest uppercase">神笔 · 末日档案</div>
        <Link
          href="/"
          className="text-gray-400 text-xs hover:text-gray-200 transition-colors"
        >
          返回主页 →
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 mt-8">
        {/* 宠物图像 */}
        <div className="w-60 h-60 rounded-2xl bg-gray-800 overflow-hidden anim-scale-in">
          {pet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.imageUrl}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-5xl">🐾</div>
          )}
        </div>

        {/* 名字 */}
        <h1
          className="text-white text-3xl font-bold anim-fade-up anim-glow"
          style={{ animationDelay: '300ms' }}
        >
          {pet.name}
        </h1>

        {/* 属性 */}
        <div
          className="w-full max-w-sm space-y-2 text-sm anim-fade-up"
          style={{ animationDelay: '480ms' }}
        >
          <div className="flex justify-between text-gray-500">
            <span>栖息地</span>
            <span className="text-gray-300">{pet.habitat}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>性格</span>
            <span className="text-gray-300">{pet.personality}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>HP</span>
            <span className="text-gray-300">{pet.hp}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>阶段</span>
            <span className="text-gray-300">{pet.stage}</span>
          </div>
        </div>

        {/* 技能 */}
        <div className="w-full max-w-sm">
          <p
            className="text-gray-600 text-xs mb-2 anim-fade"
            style={{ animationDelay: '600ms' }}
          >
            技能
          </p>
          <div className="flex flex-wrap gap-2">
            {pet.skills.map((s, i) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs anim-fade-up"
                style={{ animationDelay: `${650 + i * 120}ms` }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 故事 */}
        <p
          className="text-gray-500 text-xs leading-relaxed text-center max-w-sm anim-fade px-6"
          style={{ animationDelay: `${650 + pet.skills.length * 120 + 100}ms` }}
        >
          {pet.story}
        </p>
      </div>

      {/* 底部 CTA + 分享 */}
      <div className="flex flex-col gap-3 mt-8 shrink-0">
        <ShareActions
          petId={pet.id}
          petName={pet.name}
          story={pet.story}
          className="w-full"
        />
        <Link
          href="/"
          className="flex items-center justify-center w-full h-14 rounded-full bg-white text-gray-900 font-semibold text-base active:scale-95 transition-transform"
        >
          我也要画一个
        </Link>
      </div>
    </div>
  )
}
