/**
 * 统一的前端反馈层（toast + haptic）
 *
 * 组件不直接用 alert / navigator.vibrate，走这里。
 * 好处：换 toast 库、接原生震动（Capacitor）、静音模式、埋点都在一个文件改。
 *
 * 当前实现：
 * - toast: console.log + 最小 DOM toast（短期，后续可换 sonner / radix-toast）
 * - haptic: Vibration API（支持时），不支持时 no-op
 */

export type ToastKind = 'info' | 'success' | 'warn' | 'error'
export type HapticKind = 'light' | 'success' | 'warn' | 'error'

const HAPTIC_PATTERNS: Record<HapticKind, number[]> = {
  light: [10],
  success: [10, 40, 10],
  warn: [20, 40, 20],
  error: [40, 40, 40, 40, 40],
}

export function haptic(kind: HapticKind = 'light'): void {
  if (typeof window === 'undefined') return
  const v = window.navigator.vibrate
  if (!v) return
  try {
    v.call(window.navigator, HAPTIC_PATTERNS[kind])
  } catch {
    // 某些浏览器在静默模式下会 throw
  }
}

const TOAST_COLORS: Record<ToastKind, string> = {
  info: 'rgba(30,41,59,0.92)',
  success: 'rgba(6,78,59,0.92)',
  warn: 'rgba(120,53,15,0.92)',
  error: 'rgba(127,29,29,0.92)',
}

export interface ResultReward {
  minutes?: number
  exp?: number
}

/**
 * 操作结果联动反馈：toast + haptic 一次调用。
 * 用于 pass/fail/timeout 统一通道，避免散落的 toast+haptic 手动组合。
 */
export function result(kind: 'pass' | 'fail' | 'timeout', msg: string, reward?: ResultReward): void {
  const text = reward ? `${msg}${formatReward(reward) ? ' · ' + formatReward(reward) : ''}` : msg
  toast(text, kind === 'pass' ? 'success' : kind === 'timeout' ? 'warn' : 'error')
  haptic(kind === 'pass' ? 'success' : kind === 'timeout' ? 'warn' : 'error')
}

function formatReward(r: ResultReward): string {
  const parts: string[] = []
  if (r.minutes && r.minutes > 0) parts.push(`续命 +${r.minutes}min`)
  if (r.exp && r.exp > 0) parts.push(`EXP +${r.exp}`)
  return parts.join(' · ')
}

export function toast(message: string, kind: ToastKind = 'info'): void {
  if (typeof window === 'undefined') return
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText = `
    position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 16px);
    transform:translate(-50%,-10px);z-index:9999;
    background:${TOAST_COLORS[kind]};color:#fff;
    padding:10px 18px;border-radius:9999px;
    font-size:13px;line-height:1.4;font-family:system-ui,-apple-system,sans-serif;
    backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    box-shadow:0 4px 20px rgba(0,0,0,0.3);
    opacity:0;transition:opacity .2s ease, transform .2s ease;
    pointer-events:none;max-width:90vw;text-align:center;
  `
  document.body.appendChild(el)
  // next frame enter
  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = 'translate(-50%,0)'
  })
  // leave + cleanup
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translate(-50%,-10px)'
    setTimeout(() => el.remove(), 250)
  }, 2200)
}
