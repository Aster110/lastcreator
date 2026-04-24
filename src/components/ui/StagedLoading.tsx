'use client'
import { useEffect, useState, type ReactNode } from 'react'

export interface StagedLoadingStage {
  /** 进入此阶段的延迟 ms（相对 active=true 的时刻，首阶段 at=0） */
  at: number
  /** 阶段内容。可为文字 / ReactNode / 图片 */
  content: ReactNode
}

interface Props {
  /** 是否激活。false → 立即卸载（组件返回 null，不做 exit 动画） */
  active: boolean
  /** 按时间顺序的阶段。首项应 at=0，后续递增 */
  stages: StagedLoadingStage[]
  /** 包裹层 className（字体/颜色/位置由外部决定） */
  className?: string
}

/**
 * 通用"等待期过场动画"组件。
 *
 * 典型用例：异步调用期间（如 Claude Vision 2-30s）分阶段切换文案/图片，
 * 让用户感知"进度还在动"。active 翻 false（结果到达）立即卸载，不留残影。
 *
 * 不循环、不 loop、不倒放——只在 active 期间按时间单向推进。
 */
export default function StagedLoading({ active, stages, className = '' }: Props) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!active) {
      setPhase(0)
      return
    }
    // 首阶段已在 render 中，从第 2 阶段开始注册 timer
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < stages.length; i++) {
      const t = setTimeout(() => setPhase(i), stages[i].at)
      timers.push(t)
    }
    return () => timers.forEach(clearTimeout)
  }, [active, stages])

  if (!active) return null
  const current = stages[phase] ?? stages[0]
  if (!current) return null

  // key=phase 触发 anim-fade 重播，内容切换时自然过渡
  return (
    <div key={phase} className={`anim-fade ${className}`}>
      {current.content}
    </div>
  )
}
