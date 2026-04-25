'use client'
import { useRouter } from 'next/navigation'

interface Props {
  /** 无浏览器历史时跳转的兜底路径（直开链接/外部分享场景）*/
  fallback?: string
  /** 按钮内容（默认 ←）*/
  label?: React.ReactNode
  /** 自定义样式 */
  className?: string
  /** A11y 标签 */
  ariaLabel?: string
}

/**
 * v3.8.2: 智能返回按钮。
 *
 * - 有浏览器历史 → router.back()（保留来源页滚动位置）
 * - 直开链接 / 外部分享 → router.push(fallback)
 *
 * 治"分享链接打开 /p/[id] 后点'返回主页'被丢回游戏首页 /"的 bug。
 */
export default function BackButton({
  fallback = '/',
  label = '←',
  className,
  ariaLabel = '返回',
}: Props) {
  const router = useRouter()
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }
  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  )
}
