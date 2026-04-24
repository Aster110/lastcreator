'use client'
import { useCallback, useState } from 'react'
import type { FullPet } from '@/types/pet'
import { toast, haptic } from '@/lib/ui/feedback'

/**
 * 宠物上的写操作合集：release / （未来：rename、feed 等）
 * 返回 action + 过程态，组件不感知 fetch / alert。
 */
export function usePetActions(petId: string) {
  const [releasing, setReleasing] = useState(false)

  const release = useCallback(async (): Promise<FullPet['status'] | null> => {
    setReleasing(true)
    try {
      const res = await fetch(`/api/pets/${petId}/release`, { method: 'POST' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        toast(`放生失败：${j.error ?? res.status}`, 'error')
        haptic('error')
        return null
      }
      const data = (await res.json()) as { state: { status: FullPet['status'] } }
      toast('🕊️ 自由的风', 'success')
      haptic('success')
      return data.state.status
    } catch (err) {
      console.error('release failed', err)
      toast('网络错误，请重试', 'error')
      haptic('error')
      return null
    } finally {
      setReleasing(false)
    }
  }, [petId])

  return { release, releasing }
}
