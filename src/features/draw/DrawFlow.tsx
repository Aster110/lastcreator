'use client'
import { useEffect, useRef, useState } from 'react'
import DrawingCanvas from './DrawingCanvas'
import LoadingScreen from './LoadingScreen'
import PetCard from '@/components/ui/PetCard'
import type { DisplayPet } from '@/types/pet'

type Phase = 'drawing' | 'video1' | 'waitConfirm' | 'waitingForPet' | 'video2' | 'loading' | 'result'

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
 * drawing → video1 → waitConfirm（最后一帧+确定）→ video2 → (loading) → result
 * 点 ✓ 即并发启动 /api/generate，两段过场视频覆盖 AI 生成时间。
 */
export default function DrawFlow({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('drawing')
  const [pet, setPet] = useState<DisplayPet | null>(null)

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

  // 等待态自动推进：pet 到位后，waitingForPet → video2；video2 结束但 pet 未到 → loading → result
  useEffect(() => {
    if (phase === 'waitingForPet' && pet) setPhase('video2')
    if (phase === 'loading' && pet) setPhase('result')
  }, [phase, pet])

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
        const data = (await res.json()) as { pet: DisplayPet; fallback?: boolean }
        setPet(data.pet)
      } catch (err) {
        console.error('[generate] network error:', err)
        setPet(FALLBACK)
      }
    })()
    setPhase('video1')
  }

  const handleVideo2End = () => {
    setPhase(pet ? 'result' : 'loading')
  }

  const handleReset = () => {
    setPhase('drawing')
    setPet(null)
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
    return <WaitingForPet posterSrc="/intro-1-last.jpg" />
  }
  if (phase === 'video2') {
    // intro-2.mp4 未提供时，video 触发 error → 直接 fallback
    return (
      <FullscreenVideo
        src="/intro-2.mp4"
        onEnded={handleVideo2End}
        onError={handleVideo2End}
      />
    )
  }
  if (phase === 'loading') {
    return <LoadingScreen />
  }
  if (phase === 'result' && pet) {
    return <PetCard pet={pet} onReset={handleReset} onClose={onClose} />
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
