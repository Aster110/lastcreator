'use client'
import { useEffect } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface Props {
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
  /** 顶部提示文案，默认 "用手指画出你的宠物"（召唤场景）。任务场景可传 "画：{task.prompt}" */
  hint?: string
  /** 占位提示，默认 "✦ 在此处涂鸦" */
  placeholder?: string
}

export default function DrawingCanvas({ onConfirm, onCancel, hint, placeholder }: Props) {
  const { canvasRef, clear, getDataUrl, hasDrawn } = useCanvas({
    strokeColor: '#e2e8f0',
    lineWidth: 5,
  })

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
    <div className="fixed inset-0 bg-gray-950 flex flex-col">
      {/* 顶部提示 */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <button
          onClick={onCancel}
          className="w-10 h-10 flex items-center justify-center text-gray-500 text-xl"
        >
          ←
        </button>
        <p className="text-gray-500 text-sm">{hint ?? '用手指画出你的宠物'}</p>
        <div className="w-10" />
      </div>

      {/* 画布区域 */}
      <div className="relative flex-1 mx-4 mb-4 rounded-2xl overflow-hidden border border-gray-800">
        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
        />
        {/* 占位提示（未画时显示） */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-700 text-xs">{placeholder ?? '✦ 在此处涂鸦'}</p>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between px-10 pb-14 shrink-0">
        {/* 清除 */}
        <button
          onClick={clear}
          className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-lg active:scale-95 transition-transform"
        >
          清除
        </button>

        {/* 召唤确认 */}
        <button
          onClick={handleConfirm}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-gray-900 text-3xl font-bold shadow-lg shadow-white/10 active:scale-95 transition-transform"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
