'use client'
import { useState } from 'react'

interface Props {
  petId: string
  petName: string
  story: string
  className?: string
}

export default function ShareActions({ petId, petName, story, className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/p/${petId}`
      : `https://lastcreator.cc/p/${petId}`
    const shareData = {
      title: `${petName} · 神笔`,
      text: story,
      url,
    }
    // 优先原生分享（移动端）
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // 用户取消，fall through 到 copy
      }
    }
    // 兜底：复制链接
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('复制这个链接分享：', url)
    }
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-gray-800 text-gray-300 text-sm active:scale-95 transition-transform ${className}`}
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>链接已复制</span>
        </>
      ) : (
        <>
          <span>↗</span>
          <span>分享这只宠物</span>
        </>
      )}
    </button>
  )
}
