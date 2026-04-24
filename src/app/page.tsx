import { cookies } from 'next/headers'
import SplashScreen from '@/features/home-splash/SplashScreen'

export const dynamic = 'force-dynamic'

/**
 * 首屏只看 cookie 存在性，不查 DB：
 * - 无 cookie（全新用户）→ splash 按钮直达 /draw
 * - 有 cookie（老用户）→ splash 按钮去 /me，由 /me 自己处理活宠/墓碑分流
 */
export default async function RootPage() {
  const jar = await cookies()
  const hasRecord = !!jar.get('lc_anon')?.value
  return <SplashScreen target={hasRecord ? '/me' : '/draw'} />
}
