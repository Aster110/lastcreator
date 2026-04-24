import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { readUser } from '@/lib/identity'
import { getFullPet } from '@/lib/repo/petState'
import { computePetBirthDay, computePetAgeDays } from '@/lib/game/world'
import { countDoneTasksForPet, listHistoryForPet } from '@/lib/repo/tasks'
import ShareActions from '@/components/ui/ShareActions'
import Countdown from '@/components/ui/Countdown'
import TaskHistoryList from '@/components/ui/TaskHistoryList'
import type { DisplayTask } from '@/types/task'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  if (!id?.startsWith('p_')) return { title: '未找到 · 神笔' }

  try {
    const pet = await getFullPet(id)
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

  const pet = await getFullPet(id)
  if (!pet) notFound()

  const [birthDay, doneTasks, historyTasks, viewer] = await Promise.all([
    computePetBirthDay(pet.createdAt),
    countDoneTasksForPet(pet.id),
    listHistoryForPet(pet.id, 20),
    readUser(),
  ])
  const isOwner = !!viewer && viewer.userId === pet.ownerId
  const history: DisplayTask[] = historyTasks.map(t => ({
    id: t.id,
    kind: t.kind,
    prompt: t.prompt,
    reward: t.reward,
    status: t.status,
    expiresAt: t.expiresAt,
    proofR2Key: t.proofR2Key,
    aiVerdict: t.aiVerdict,
  }))
  const ageDays = computePetAgeDays(pet.createdAt)
  const birthDate = new Date(pet.createdAt)
  const birthDateStr = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`

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

        {/* 诞生铭牌（末日第 N 天诞生 · 存活 X 天） */}
        <div
          className="text-center space-y-0.5 anim-fade"
          style={{ animationDelay: '400ms' }}
        >
          <p className="text-gray-400 text-xs tracking-wider">
            诞生于末日第 <span className="text-gray-200 tabular-nums">{birthDay}</span> 天
          </p>
          <p className="text-gray-600 text-[10px]">
            {birthDateStr}
            {ageDays > 0 && ` · 已陪伴 ${ageDays} 天`}
          </p>
        </div>

        {/* 倒计时大号 */}
        <div
          className="flex flex-col items-center gap-1 anim-fade-up"
          style={{ animationDelay: '460ms' }}
        >
          <p className="text-gray-600 text-[10px] tracking-widest uppercase">剩余生命</p>
          <Countdown
            expiresAt={pet.lifeExpiresAt}
            status={pet.status}
            variant="hero"
            staticLabel={pet.status === 'released' ? '🕊️ 已放生' : pet.status === 'dead' ? '🕯️ 已安息' : ''}
          />
        </div>

        {/* 属性 */}
        <div
          className="w-full max-w-sm space-y-2 text-sm anim-fade-up"
          style={{ animationDelay: '480ms' }}
        >
          <Row label="栖息地" value={pet.habitat} />
          <Row label="性格" value={pet.personality} />
          <Row label="阶段" value={pet.stage} />
          <Row label="EXP" value={String(pet.exp)} highlight />
          <Row label="完成任务" value={String(doneTasks)} />
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

        {/* 任务历史（所有人可看，只读） */}
        <div
          className="w-full max-w-sm mt-4 anim-fade"
          style={{ animationDelay: `${650 + pet.skills.length * 120 + 200}ms` }}
        >
          <p className="text-gray-600 text-xs mb-2">任务履历 · {doneTasks} 次完成</p>
          <TaskHistoryList tasks={history} />
        </div>
      </div>

      {/* 底部 CTA + 分享 */}
      <div className="flex flex-col gap-3 mt-8 shrink-0">
        <ShareActions
          petId={pet.id}
          petName={pet.name}
          story={pet.story}
          className="w-full"
        />
        {isOwner ? (
          <Link
            href={`/me/${pet.id}`}
            className="flex items-center justify-center w-full h-14 rounded-full bg-white text-gray-900 font-semibold text-base active:scale-95 transition-transform"
          >
            去做任务 →
          </Link>
        ) : (
          <Link
            href="/draw"
            className="flex items-center justify-center w-full h-14 rounded-full bg-white text-gray-900 font-semibold text-base active:scale-95 transition-transform"
          >
            我也要画一个
          </Link>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-gray-500">
      <span>{label}</span>
      <span className={highlight ? 'text-white tabular-nums' : 'text-gray-300'}>{value}</span>
    </div>
  )
}
