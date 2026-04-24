'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  /** 新用户 → /draw 直接画；老用户 → /me 档案 */
  target: '/draw' | '/me'
}

export default function SplashScreen({ target }: Props) {
  const [exiting, setExiting] = useState(false)
  const router = useRouter()

  const handleStart = () => {
    if (exiting) return
    setExiting(true)
    router.prefetch(target)
    setTimeout(() => router.push(target), 1000)
  }

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden">
      <picture>
        <source srcSet="/start.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/start.jpg"
          alt=""
          aria-hidden
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />
      </picture>

      {/* 标题 logo（中上方）+ 背后局部虚化；呼吸漂浮 / 飞出 */}
      <div className="absolute top-[22%] left-1/2 -translate-x-1/2 w-[72vw] max-w-[320px]">
        <div className={exiting ? 'anim-fly-up' : 'anim-breathe'}>
          <div
            aria-hidden
            className="absolute -inset-6 backdrop-blur-sm pointer-events-none"
            style={{
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 38%, transparent 78%)',
              maskImage: 'radial-gradient(ellipse at center, black 38%, transparent 78%)',
            }}
          />
          <picture>
            <source srcSet="/title.webp" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/title.png"
              alt="Last Creator"
              width={1024}
              height={440}
              fetchPriority="high"
              className="relative w-full h-auto select-none pointer-events-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            />
          </picture>
        </div>
      </div>

      {/* 开始游戏 图形按钮 */}
      <button
        onClick={handleStart}
        aria-label="开始游戏"
        disabled={exiting}
        className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[62vw] max-w-[240px] active:scale-95 transition-transform disabled:opacity-70"
      >
        <picture>
          <source srcSet="/start-btn.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/start-btn.png"
            alt="Start"
            width={1024}
            height={615}
            fetchPriority="high"
            className="w-full h-auto select-none pointer-events-none drop-shadow-[0_6px_20px_rgba(0,0,0,0.7)]"
          />
        </picture>
      </button>
    </div>
  )
}
