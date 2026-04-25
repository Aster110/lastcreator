'use client'

interface Props {
  title: string
  body: string
  cause: 'died' | 'released'
}

/**
 * v3.9.3: 墓碑叙事卡。
 * 由 deathNarrator 异步生成（pet.died/released 事件触发）。
 * 没生成完时父组件不渲染本组件（用占位文案）。
 *
 * 视觉：暗底 + 半透明边框 + 标题大号 + body 等宽行距宽松。
 * 无内嵌分享按钮（沿用 /me/[id] 底部 ShareActions）。
 */
export default function TombstoneShareCard({ title, body, cause }: Props) {
  return (
    <div className="rounded-2xl bg-black/55 border border-white/15 px-5 py-5 backdrop-blur-sm anim-fade-up">
      <p className="text-white/55 text-[10px] tracking-widest uppercase mb-2">
        {cause === 'released' ? '🕊️ 它的一程' : '🕯️ 它的一生'}
      </p>
      <h3 className="text-white text-lg font-semibold mb-3 [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
        {title}
      </h3>
      <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">
        {body}
      </p>
    </div>
  )
}
