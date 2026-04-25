'use client'
import { useCallback, useEffect, useState } from 'react'
import type { DisplayTask } from '@/types/task'

export interface TasksPayload {
  active: DisplayTask | null
  dailyDone: number
  dailyMax: number
  /** v3.2：任务履历（已完成/拒绝/过期），倒序，最多 20 条 */
  history: DisplayTask[]
  /** v3.8: reroll 剩余次数（owner 维度，自然日 0 点重置） */
  remainingRerolls: number
  /** v3.8: reroll 上限（默认 3） */
  maxRerolls: number
}

/**
 * 拉取单只宠物的 active task + 今日计数 + reroll 剩余次数。
 * 返回 { data, loading, refresh, applyReroll }，组件不感知 fetch。
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

  /** v3.8: reroll 成功后用新 task + 剩余次数原地更新，不走网络 refresh */
  const applyReroll = useCallback((task: DisplayTask, remainingRerolls: number) => {
    setData(prev => (prev ? { ...prev, active: task, remainingRerolls } : prev))
  }, [])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    void refresh()
  }, [petId, enabled, refresh])

  return { data, loading, refresh, applyReroll }
}
