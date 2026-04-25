import { toast, haptic } from './feedback'

/**
 * 复制宠物分享链接到剪贴板，自动 toast 反馈。
 *
 * v3.8.3: HeaderMenu 用，把"分享"从主屏 hero 区移进菜单。
 * 失败时降级 prompt() 让用户手动复制。
 */
export async function copyShareLink(petId: string): Promise<void> {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://lastcreator.cc'
  const url = `${origin}/p/${petId}`
  try {
    await navigator.clipboard.writeText(url)
    toast('🔗 链接已复制，去微信粘贴吧', 'success')
    haptic('light')
  } catch {
    haptic('warn')
    if (typeof window !== 'undefined') {
      window.prompt('复制这个链接分享：', url)
    }
  }
}
