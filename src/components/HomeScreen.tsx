'use client'

interface Props {
  onStart: () => void
}

export default function HomeScreen({ onStart }: Props) {
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-between px-6 py-16">
      {/* 世界状态 */}
      <div className="text-center">
        <p className="text-gray-600 text-xs tracking-widest uppercase">末日第 47 天</p>
      </div>

      {/* 主标题 */}
      <div className="text-center space-y-4">
        <h1 className="text-white text-4xl font-bold tracking-tight">神笔</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          你画的每一笔<br />都是一条生命
        </p>
      </div>

      {/* 召唤按钮 */}
      <button
        onClick={onStart}
        className="w-full max-w-xs h-14 rounded-full bg-white text-gray-900 font-semibold text-lg active:scale-95 transition-transform"
      >
        开始召唤
      </button>
    </div>
  )
}
