'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import DrawingCanvas from './DrawingCanvas'
import LoadingScreen from './LoadingScreen'
import { COPY } from '@/lib/copy/hints'
import type { DisplayPet } from '@/types/pet'

type Phase = 'drawing' | 'video1' | 'waitConfirm' | 'waitingForPet' | 'video2' | 'loading'

interface Props {
  /** 开关（父组件控制是否展示整个流程） */
  open: boolean
  /** 整个流程退出（用户取消 / 点击"再召唤一只"）*/
  onClose: () => void
}

const FALLBACK: DisplayPet = {
  id: 'local-fallback',
  name: '神秘生命体',
  habitat: '末日废墟',
  personality: '神秘而古老',
  skills: ['虚空凝视', '时间感知', '意志具现'],
  hp: 100,
  story: '它从你的笔触中诞生，带着世界最后的记忆。',
  imageUrl: null,
}

/**
 * 召唤流程子状态机。
 * drawing → video1 → waitConfirm（最后一帧+确定）→ (waitingForPet) → video2 → (loading) → router.replace('/me?welcome=1')
 * 点 ✓ 即并发启动 /api/generate，两段过场视频覆盖 AI 生成时间。
 * 生成成功（pet 到手）后不再内部渲染 PetCard，改跳 /me?welcome=1，/me 会挂 WelcomeOverlay 展示 yes.jpg。
 */
type FailMode = null | 'rejected' | 'error' | 'already_alive'

const RETRY_COOLDOWN_SEC = 30

export default function DrawFlow({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('drawing')
  const [pet, setPet] = useState<DisplayPet | null>(null)
  const [failMode, setFailMode] = useState<FailMode>(null)
  const [failedAt, setFailedAt] = useState<number | null>(null)
  const [cooldownSec, setCooldownSec] = useState(0)
  const router = useRouter()

  // 失败瞬间记录时间戳，用于 30s 重试冷却——防用户暴力连点把 zzz quota 继续打光
  useEffect(() => {
    if (failMode) setFailedAt(Date.now())
  }, [failMode])

  useEffect(() => {
    if (!failedAt) {
      setCooldownSec(0)
      return
    }
    const tick = () => {
      const remain = Math.max(0, RETRY_COOLDOWN_SEC - Math.floor((Date.now() - failedAt) / 1000))
      setCooldownSec(remain)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [failedAt])

  // 预取 /me 让 welcome 跳转瞬时
  useEffect(() => {
    router.prefetch('/me?welcome=1')
  }, [router])

  // 进入 drawing 即预热两段视频，避免切换时黑屏等待
  useEffect(() => {
    if (!open) return
    const mk = (href: string) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'video'
      link.href = href
      document.head.appendChild(link)
      return link
    }
    const links = [mk('/intro-1.mp4'), mk('/intro-2.mp4')]
    return () => { links.forEach(l => l.remove()) }
  }, [open])

  // 统一跳转：硬 nav 兜底 router 假死
  const goWelcome = () => {
    console.log('[DrawFlow] → /me?welcome=1')
    router.replace('/me?welcome=1')
    // 300ms 后若还没真的导航走，硬 replace
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/draw')) {
        window.location.replace('/me?welcome=1')
      }
    }, 300)
  }

  // 等待态自动推进：
  // - waitingForPet + pet 到手 → 进 video2
  // - loading + pet 到手 → 直接跳 welcome 页
  useEffect(() => {
    if (phase === 'waitingForPet' && pet) setPhase('video2')
    if (phase === 'loading' && pet) goWelcome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pet])

  // video2 兜底：视频超时 15s 还没 onEnded，强制跳转（防 iOS/解码异常卡死）
  useEffect(() => {
    if (phase !== 'video2') return
    const timer = setTimeout(() => {
      console.warn('[DrawFlow] video2 timeout, force navigate')
      if (pet) goWelcome()
      else setPhase('loading')
    }, 15000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!open) return null

  const handleConfirm = (dataUrl: string) => {
    // 并发：立即请求 AI 生成 + 切入过场视频 1
    ;(async () => {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        })
        // v3.5: 409 单宠范式拒绝——独立画面，不走 fallback
        if (res.status === 409) {
          console.log('[DrawFlow] /api/generate 409 already_alive')
          setFailMode('already_alive')
          return
        }
        const data = (await res.json()) as { pet: DisplayPet; fallback?: boolean; reason?: 'rate_limit' | 'error' }
        console.log('[DrawFlow] /api/generate resp, pet.id =', data.pet?.id, 'fallback =', data.fallback, 'reason =', data.reason)
        if (data.fallback) {
          // 429 → rejected（立即打断视频）；其他 error → 让视频继续播，结束后兜底
          setFailMode(data.reason === 'rate_limit' ? 'rejected' : 'error')
          return
        }
        setPet(data.pet)
      } catch (err) {
        console.error('[generate] network error:', err)
        // 网络错误算通用 error：让视频继续（表现类似上游超时），结束后兜底
        setFailMode('error')
      }
    })()
    setPhase('video1')
  }

  const handleRetry = () => {
    if (cooldownSec > 0) return
    setFailMode(null)
    setFailedAt(null)
    setPet(null)
    setPhase('drawing')
  }

  const handleVideo2End = () => {
    console.log('[DrawFlow] video2 onEnded fired, pet =', pet?.id ?? 'null')
    if (pet) goWelcome()
    else setPhase('loading')
  }

  // rejected（429）优先级最高：立刻打断一切视频，显式"世界拒绝"
  if (failMode === 'rejected') {
    return <RejectedScreen onRetry={handleRetry} onBack={onClose} cooldownSec={cooldownSec} />
  }
  if (failMode === 'already_alive') {
    return <AlreadyAliveScreen onBack={onClose} />
  }

  if (phase === 'drawing') {
    return <DrawingCanvas onConfirm={handleConfirm} onCancel={onClose} />
  }
  if (phase === 'video1') {
    return <FullscreenVideo src="/intro-1.mp4" onEnded={() => setPhase('waitConfirm')} />
  }
  if (phase === 'waitConfirm') {
    return (
      <WaitConfirm
        posterSrc="/intro-1-last.jpg"
        onConfirm={() => setPhase(pet ? 'video2' : 'waitingForPet')}
      />
    )
  }
  if (phase === 'waitingForPet') {
    // 非 429 错误在这阶段暴露出来：视频演完了 pet 还没到，等下去没意义
    if (failMode === 'error') return <GenFailedScreen onRetry={handleRetry} onBack={onClose} cooldownSec={cooldownSec} />
    return <WaitingForPet posterSrc="/intro-1-last.jpg" />
  }
  if (phase === 'video2') {
    return (
      <FullscreenVideo
        src="/intro-2.mp4"
        onEnded={handleVideo2End}
        onError={handleVideo2End}
      />
    )
  }
  if (phase === 'loading') {
    if (failMode === 'error') return <GenFailedScreen onRetry={handleRetry} onBack={onClose} cooldownSec={cooldownSec} />
    return <LoadingScreen />
  }
  return null
}

function FullscreenVideo({
  src,
  onEnded,
  onError,
}: {
  src: string
  onEnded: () => void
  onError?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)

  // 进入时主动调用 play()：借用点"✓"/"确定"的用户手势上下文放声音。
  // 失败（iOS 某些低电模式等）则降级静音再播一次，保证画面至少走完。
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.play().catch(() => {
      v.muted = true
      v.play().catch(() => {})
    })
  }, [])

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={ref}
        src={src}
        autoPlay
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        onEnded={onEnded}
        onError={onError}
      />
    </div>
  )
}

function WaitingForPet({ posterSrc }: { posterSrc: string }) {
  return (
    <div className="fixed inset-0 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3
                      px-5 py-3 rounded-full bg-black/60 backdrop-blur-sm text-stone-100 text-sm">
        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        <span>正在生成...</span>
      </div>
    </div>
  )
}

function GenFailedScreen({
  onRetry,
  onBack,
  cooldownSec,
}: {
  onRetry: () => void
  onBack: () => void
  cooldownSec: number
}) {
  const disabled = cooldownSec > 0
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center gap-6 px-8">
      <div className="text-5xl">💢</div>
      <div className="text-center space-y-2">
        <p className="text-white text-lg font-semibold">召唤失败</p>
        <p className="text-gray-400 text-sm">AI 暂时没能听懂这只宠物。<br />请再画一次试试。</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <button
          onClick={onRetry}
          disabled={disabled}
          className={`w-full h-12 rounded-full font-semibold transition-transform ${
            disabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-white text-gray-900 active:scale-95'
          }`}
        >
          {disabled ? `重新画（${cooldownSec}s）` : '重新画'}
        </button>
        <button
          onClick={onBack}
          className="w-full h-12 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-sm active:scale-95 transition-transform"
        >
          返回档案
        </button>
      </div>
    </div>
  )
}

/**
 * 429（上游图生图限流）专属画面：打断一切视频，叙事化 "world rejected"
 */
/**
 * v3.5: 单宠范式专属拒绝画面（409 already_alive）。
 * 不走 30s 冷却——主 CTA 是"去看它"（硬跳 /me）。
 */
function AlreadyAliveScreen({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center gap-8 px-8 bg-cover bg-center"
      style={{ backgroundImage: 'url(/daily-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="relative text-5xl opacity-80">🐾</div>
      <div className="relative text-center space-y-3">
        <p className="text-white text-xl font-semibold tracking-wider [text-shadow:0_0_20px_rgba(255,255,255,0.2)]">
          {COPY.drawFlow.alreadyAliveTitle}
        </p>
        <p className="text-white/70 text-sm tracking-wider">
          {COPY.drawFlow.alreadyAliveSubtitle}
        </p>
      </div>
      <div className="relative flex flex-col gap-3 w-full max-w-xs mt-2">
        <a
          href="/me"
          className="w-full h-12 rounded-full bg-white text-gray-900 font-semibold flex items-center justify-center active:scale-95 transition-transform"
        >
          {COPY.drawFlow.alreadyAliveCTA}
        </a>
        <button
          onClick={onBack}
          className="w-full h-12 rounded-full bg-white/10 border border-white/30 text-white/80 text-sm active:scale-95 transition-transform"
        >
          返回
        </button>
      </div>
    </div>
  )
}

function RejectedScreen({
  onRetry,
  onBack,
  cooldownSec,
}: {
  onRetry: () => void
  onBack: () => void
  cooldownSec: number
}) {
  const disabled = cooldownSec > 0
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-8 px-8">
      <div className="text-6xl opacity-70">🕯️</div>
      <div className="text-center space-y-3">
        <p className="text-white text-xl font-semibold tracking-wider [text-shadow:0_0_20px_rgba(220,50,50,0.4)]">
          这个世界拒绝了你的召唤
        </p>
        <p className="text-gray-500 text-xs tracking-widest">
          {disabled ? `世界正在恢复...${cooldownSec}s` : '稍后再试'}
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
        <button
          onClick={onRetry}
          disabled={disabled}
          className={`w-full h-12 rounded-full font-semibold transition-transform ${
            disabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-white text-gray-900 active:scale-95'
          }`}
        >
          {disabled ? `重新召唤（${cooldownSec}s）` : '重新召唤'}
        </button>
        <button
          onClick={onBack}
          className="w-full h-12 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-sm active:scale-95 transition-transform"
        >
          返回档案
        </button>
      </div>
    </div>
  )
}

function WaitConfirm({
  posterSrc,
  onConfirm,
}: {
  posterSrc: string
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black">
      <img
        src={posterSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <button
        onClick={onConfirm}
        aria-label="确定"
        className="absolute bottom-24 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full
                   bg-white/95 overflow-hidden
                   shadow-[0_0_30px_rgba(255,255,255,0.4)]
                   ring-2 ring-amber-200/40
                   active:scale-95 transition-transform"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/buttons/yes.jpg" alt="" className="w-full h-full object-cover" />
      </button>
    </div>
  )
}
