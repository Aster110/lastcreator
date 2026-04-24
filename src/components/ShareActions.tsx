'use client'
import { useState } from 'react'

interface Props {
  petId: string
  /** 保留 props 兼容调用方；现在只复制链接不用 */
  petName?: string
  story?: string
  className?: string
}

export default function ShareActions({ petId, className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/p/${petId}`
      : `https://lastcreator.cc/p/${petId}`
    // 直接复制链接，用户自己去微信/朋友圈粘贴
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
          <span>链接已复制，去粘贴给朋友吧</span>
        </>
      ) : (
        <>
          <span>↗</span>
          <span>复制分享链接</span>
        </>
      )}
    </button>
  )
}
