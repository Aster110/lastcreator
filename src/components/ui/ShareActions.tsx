'use client'
import { useState } from 'react'

interface Props {
  petId: string
  /** 保留 props 兼容调用方；现在只复制链接不用 */
  petName?: string
  story?: string
  className?: string
  /** subtle = 灰底（默认，详情页/公开页）；primary = 白底，用在 Welcome 主 CTA 区 */
  variant?: 'subtle' | 'primary'
}

export default function ShareActions({ petId, className = '', variant = 'subtle' }: Props) {
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

  const variantCls =
    variant === 'primary'
      ? 'h-14 bg-white text-gray-900 text-sm font-semibold'
      : 'h-12 bg-gray-800 text-gray-300 text-sm'

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 px-6 rounded-full active:scale-95 transition-transform ${variantCls} ${className}`}
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>已复制</span>
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
