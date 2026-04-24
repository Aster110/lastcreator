'use client'
import { useEffect, useState } from 'react'

const MESSAGES = [
  '正在解析你的咒文…',
  '生命正在生成…',
  '它正在醒来…',
]

export default function LoadingScreen() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % MESSAGES.length), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center gap-8">
      <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      <p className="text-gray-400 text-sm">{MESSAGES[idx]}</p>
    </div>
  )
}
