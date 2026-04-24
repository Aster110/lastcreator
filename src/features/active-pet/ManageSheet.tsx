'use client'
import { useState } from 'react'
import { COPY } from '@/lib/copy/hints'

interface Props {
  petName: string
  releasing: boolean
  onConfirmRelease(): void | Promise<void>
}

/**
 * v3.5: 放生藏二级——防止误触杀死宠物（Q7 硬约束）。
 * 入口 "⚙️ 管理" 常驻底部但不抢眼；点开才出现放生按钮 + 原生 confirm。
 */
export default function ManageSheet({ petName, releasing, onConfirmRelease }: Props) {
  const [open, setOpen] = useState(false)

  const handleRelease = async () => {
    if (releasing) return
    const ok = window.confirm(COPY.manage.releaseConfirm(petName))
    if (!ok) return
    await onConfirmRelease()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-10 text-gray-400 text-xs active:scale-[0.98] transition-transform"
      >
        {COPY.manage.openLabel}
      </button>
    )
  }

  return (
    <div className="rounded-2xl bg-gray-900/40 border border-gray-800 px-4 py-3 space-y-2">
      <button
        onClick={handleRelease}
        disabled={releasing}
        className="w-full h-11 rounded-full bg-red-950/60 border border-red-800 text-red-200 text-sm active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {releasing ? COPY.manage.releaseRunning : COPY.manage.releaseLabel}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="w-full h-9 text-gray-500 text-xs active:scale-[0.98] transition-transform"
      >
        {COPY.manage.closeLabel}
      </button>
    </div>
  )
}
