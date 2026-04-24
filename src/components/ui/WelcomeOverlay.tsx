'use client'
import { useRouter } from 'next/navigation'
import ShareActions from './ShareActions'
import Countdown from './Countdown'
import type { DisplayPet } from '@/types/pet'

interface Props {
  /** 新诞生的宠物。null 时不渲染 overlay（例如 welcome=1 但数据库找不到宠） */
  pet: DisplayPet | null
}

/**
 * 生成成功庆祝页：覆盖在 /me gallery 上方，展示新宠全量信息 + Yes 按钮。
 * 由 /me/page.tsx 在 searchParams.welcome='1' 时传入最新宠。
 * 点击 Yes → router.replace('/me') 卸载 overlay、显示档案。
 */
export default function WelcomeOverlay({ pet }: Props) {
  const router = useRouter()
  if (!pet) return null

  const skillDelayBase = 650
  const skillStep = 120
  const storyDelay = skillDelayBase + pet.skills.length * skillStep + 100
  const actionsDelay = skillDelayBase + pet.skills.length * skillStep + 250

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col px-6 py-12 overflow-y-auto bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/daily-bg.jpg)' }}
    >
      <div className="flex-1 flex flex-col items-center gap-5">
        {/* 宠物图像 */}
        <div
          className="w-56 h-56 rounded-2xl bg-gray-800 overflow-hidden flex items-center justify-center anim-scale-in"
          style={{ animationDelay: '0ms' }}
        >
          {pet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.imageUrl}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-600 text-5xl">🐾</span>
          )}
        </div>

        {/* 名字 */}
        <h2
          className="text-white text-3xl font-bold anim-fade-up anim-glow"
          style={{ animationDelay: '300ms' }}
        >
          {pet.name}
        </h2>

        {/* 寿命倒计时 */}
        {pet.lifeExpiresAt && (
          <div
            className="flex flex-col items-center gap-1 anim-fade-up"
            style={{ animationDelay: '400ms' }}
          >
            <p className="text-white text-[10px] tracking-widest uppercase">剩余生命</p>
            <Countdown
              expiresAt={pet.lifeExpiresAt}
              status={pet.status ?? 'alive'}
              variant="hero"
            />
          </div>
        )}

        {/* 属性 */}
        <div
          className="w-full space-y-2 text-sm anim-fade-up text-white"
          style={{ animationDelay: '480ms' }}
        >
          <div className="flex justify-between">
            <span>栖息地</span>
            <span>{pet.habitat}</span>
          </div>
          <div className="flex justify-between">
            <span>性格</span>
            <span>{pet.personality}</span>
          </div>
        </div>

        {/* 技能 */}
        <div className="w-full">
          <p
            className="text-white text-xs mb-2 anim-fade"
            style={{ animationDelay: '600ms' }}
          >
            技能
          </p>
          <div className="flex flex-wrap gap-2">
            {pet.skills.map((s, i) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-gray-800/80 text-white text-xs anim-fade-up"
                style={{ animationDelay: `${skillDelayBase + i * skillStep}ms` }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 故事 */}
        {pet.story && (
          <p
            className="text-white text-xs leading-relaxed text-center anim-fade"
            style={{ animationDelay: `${storyDelay}ms` }}
          >
            {pet.story}
          </p>
        )}
      </div>

      {/* 底部：分享链接（左）+ Yes 按钮（右）并排 */}
      <div
        className="mt-8 flex flex-row items-center gap-3 anim-fade"
        style={{ animationDelay: `${actionsDelay}ms` }}
      >
        {pet.id && pet.id !== 'local-fallback' && (
          <ShareActions
            petId={pet.id}
            petName={pet.name}
            story={pet.story}
            variant="primary"
            className="flex-1"
          />
        )}
        <button
          onClick={() => router.replace('/me')}
          aria-label="进入档案"
          className="w-14 h-14 shrink-0 rounded-full bg-white/95 overflow-hidden
                     shadow-[0_0_24px_rgba(255,255,255,0.3)]
                     ring-2 ring-amber-200/40
                     active:scale-95 transition-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/buttons/yes.jpg" alt="" className="w-full h-full object-cover" />
        </button>
      </div>
    </div>
  )
}
