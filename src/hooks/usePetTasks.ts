'use client'
import { useCallback, useEffect, useState } from 'react'
import type { DisplayTask } from '@/types/task'

export interface TasksPayload {
  active: DisplayTask | null
  dailyDone: number
  dailyMax: number
}

/**
 * 拉取单只宠物的 active task + 今日计数。
 * 返回 { data, loading, refresh }，组件不感知 fetch。
 *
 * `enabled` = false 时不请求（比如宠物已放生/死）。
 */
export function usePetTasks(petId: string, enabled = true) {
  const [data, setData] = useState<TasksPayload | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const r = await fetch(`/api/pets/${petId}/tasks`)
      const j = (await r.json()) as TasksPayload
      setData(j)
    } catch {
      // 保留旧 data，不覆盖成 null（避免 UI 闪回）
    } finally {
      setLoading(false)
    }
  }, [petId, enabled])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    void refresh()
  }, [petId, enabled, refresh])

  return { data, loading, refresh }
}
