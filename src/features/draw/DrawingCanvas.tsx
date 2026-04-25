'use client'
import { useEffect, useRef } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface Props {
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
  /** 顶部提示文案，默认 "用手指画出你的宠物"（召唤场景）。任务场景可传 "画：{task.prompt}" */
  hint?: string
  /** 占位提示，默认 "✦ 在此处涂鸦" */
  placeholder?: string
  /** v3.9.1: 是否显示"用照片代替"次入口（召唤场景默认 true，任务场景由 DoodleProof 不传）*/
  allowPhotoFallback?: boolean
}

export default function DrawingCanvas({ onConfirm, onCancel, hint, placeholder, allowPhotoFallback = true }: Props) {
  const { canvasRef, clear, getDataUrl, hasDrawn } = useCanvas({
    strokeColor: '#1a1410',
    lineWidth: 4,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // v3.9.1: 用照片代替——hidden file input + reader.readAsDataURL → onConfirm 同 callback
  const handlePickPhoto = () => {
    fileInputRef.current?.click()
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      if (dataUrl) onConfirm(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = '' // reset 让能再选同一张
  }

  // 进入时锁定页面滚动
  useEffect(() => {
    const prev = {
      overflow: document.body.style.overflow,
      touchAction: document.body.style.touchAction,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.touchAction = prev.touchAction
    }
  }, [])

  const handleConfirm = () => {
    if (!hasDrawn.current) return
    onConfirm(getDataUrl())
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-stone-950 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/summon.jpg)' }}
    >
      {/* 顶部提示（半透明深底卡片避免背景图干扰） */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2 shrink-0">
        <button
          onClick={onCancel}
          className="w-10 h-10 flex items-center justify-center text-stone-200/80 text-xl rounded-full bg-black/40 backdrop-blur-sm"
        >
          ←
        </button>
        <p className="text-stone-100/90 text-sm px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
          {hint ?? '用手指画出你的宠物'}
        </p>
        <div className="w-10" />
      </div>

      {/* v3.9.1: "用照片代替"次入口（弱视觉，不抢主流程）*/}
      {allowPhotoFallback && (
        <div className="flex justify-center pb-2 shrink-0">
          <button
            onClick={handlePickPhoto}
            type="button"
            className="text-stone-200/70 text-xs px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm active:scale-95 transition-transform"
          >
            📷 用照片代替
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* 画布区域：居中毛玻璃画框，凸显羊皮纸中央留白 */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className="relative w-[86%] max-w-[340px] h-[65vh] max-h-[520px] rounded-full overflow-hidden
                     bg-amber-50/8 backdrop-blur-[2px] backdrop-brightness-110 backdrop-saturate-90
                     border border-stone-900/35
                     shadow-[0_8px_30px_-6px_rgba(0,0,0,0.5),inset_0_0_24px_rgba(120,80,40,0.12)]"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          />
          {/* 占位提示（未画时显示） */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-stone-800/40 text-xs tracking-wider">
              {placeholder ?? '✦ 在此处涂鸦'}
            </p>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between px-10 pb-14 shrink-0">
        {/* 清除 */}
        <button
          onClick={clear}
          aria-label="清除"
          className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-stone-200/20
                     overflow-hidden
                     active:scale-95 transition-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/buttons/reset.jpg" alt="" className="w-full h-full object-cover" />
        </button>

        {/* 召唤确认 */}
        <button
          onClick={handleConfirm}
          aria-label="确认"
          className="w-20 h-20 rounded-full bg-stone-50 overflow-hidden
                     shadow-[0_0_30px_rgba(255,230,180,0.5)]
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
