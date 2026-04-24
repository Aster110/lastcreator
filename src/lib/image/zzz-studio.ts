import type { ImageProvider } from './index'

const BASE = 'https://imagestudio.riveroll.top'
// poll 策略：先等 15s 再轮询（图生图通常要 15-30s 才出结果，早 poll 纯浪费 quota）
// 前端两段视频 + waitConfirm 总时长 ≥17s，用户感知无延迟
const POLL_INITIAL_DELAY_MS = 15_000
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 50_000
// submit 429 退避：瞬时限流多数 2-5s 能恢复
const SUBMIT_RETRY_DELAYS_MS = [1_000, 3_000, 7_000]
// zzz 账号级上限 10 并发，我们留 4 个 buffer：≥6 活跃就直接拒新请求
// 避免用户 submit 后失败 + 任务残留继续占队列槽，雪球到 10 个堵死
const QUEUE_GATE_THRESHOLD = 6

function token(): string {
  const t = process.env.ZZZ_ACCESS_TOKEN
  if (!t) throw new Error('ZZZ_ACCESS_TOKEN not configured')
  return t
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token()}` }
}

async function uploadDoodle(base64DataUrl: string): Promise<{ libraryId: string; personId: string }> {
  const [, base64] = base64DataUrl.split(',')
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'image/png' })

  const form = new FormData()
  form.append('files', blob, 'doodle.png')
  form.append('library_name', `lc_${Date.now()}`)

  const res = await fetch(`${BASE}/api/test-field/person-library/create-from-folder`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) throw new Error(`zzz upload failed: ${res.status}`)
  const data = (await res.json()) as { id?: string; models?: { id: string }[] }
  const personId = data?.models?.[0]?.id
  if (!data?.id || !personId) throw new Error('zzz upload: missing ids')
  return { libraryId: data.id, personId }
}

async function submitGenerate(prompt: string, libraryId: string, personId: string): Promise<string> {
  const body = JSON.stringify({
    prompt,
    model_ids: ['wavespeed-gpt-image-1.5'],
    dimension_mode: 'preset',
    aspect_ratio: '1:1',
    person_ids: [{ library_id: libraryId, model_id: personId }],
  })
  const delays = [0, ...SUBMIT_RETRY_DELAYS_MS]
  let lastStatus = 0
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      console.log(`[zzz] submit retry #${i} after ${delays[i]}ms (prev status ${lastStatus})`)
      await new Promise(r => setTimeout(r, delays[i]))
    }
    const res = await fetch(`${BASE}/api/test-field/generate`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body,
    })
    if (res.ok) {
      const { task_id } = (await res.json()) as { task_id?: string }
      if (!task_id) throw new Error('zzz generate: no task_id')
      return task_id
    }
    lastStatus = res.status
    // 仅对 429 退避重试；4xx/5xx 其它状态直接失败（重试也没用）
    if (res.status !== 429) break
  }
  throw new Error(`zzz generate failed: ${lastStatus}`)
}

async function pollUntilDone(taskId: string): Promise<void> {
  // 图生图通常 15-30s 出结果，先等 15s 再轮询，省 2-3 次请求
  // 前端两段过场视频 + waitConfirm 总时长 ≥17s，poll 延迟用户无感
  await new Promise(r => setTimeout(r, POLL_INITIAL_DELAY_MS))

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/tasks/${taskId}`, { headers: authHeaders() })
    const data = (await res.json()) as { task?: { status?: string; error_message?: string } }
    const status = (data?.task?.status ?? '').toLowerCase()
    if (status === 'completed') return
    if (status === 'failed') throw new Error(`zzz task failed: ${data?.task?.error_message}`)
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error('zzz poll timeout')
}

async function getResultUrl(taskId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/test-field/${taskId}/results`, { headers: authHeaders() })
  const data = (await res.json()) as { images?: { image_url?: string }[] }
  const url = data?.images?.[0]?.image_url
  if (!url) throw new Error('zzz: no result image')
  return url
}

async function cleanupLibrary(libraryId: string): Promise<void> {
  await fetch(`${BASE}/api/test-field/person-library/${libraryId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).catch(() => {})
}

/** 取消 zzz 任务，释放账户队列槽。任何错误静默（task 可能已 completed/cancelled） */
async function cancelTask(taskId: string): Promise<void> {
  await fetch(`${BASE}/api/tasks/${taskId}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  }).catch(() => {})
}

/** 查询当前账户活跃任务数（pending/processing/running/queued）。失败返回 null，调用方按"不阻断"处理 */
async function getActiveTaskCount(): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/api/tasks?limit=20`, { headers: authHeaders() })
    if (!res.ok) return null
    const data = (await res.json()) as { tasks?: Array<{ status?: string; can_cancel?: boolean }> }
    const active = (data.tasks ?? []).filter(t => {
      const s = (t.status ?? '').toLowerCase()
      return s === 'pending' || s === 'processing' || s === 'running' || s === 'queued'
    })
    return active.length
  } catch {
    return null
  }
}

export const zzzStudioProvider: ImageProvider = {
  async generateFromDoodle(doodleDataUrl, stylePrompt) {
    // 门禁：zzz 账户级队列接近上限就早拒，省 upload + submit 浪费，也防继续堆积
    const active = await getActiveTaskCount()
    if (active !== null && active >= QUEUE_GATE_THRESHOLD) {
      console.warn(`[zzz] queue gate rejected: ${active}/${QUEUE_GATE_THRESHOLD} active`)
      throw new Error(`zzz queue full: ${active}/${QUEUE_GATE_THRESHOLD}`)
    }

    const { libraryId, personId } = await uploadDoodle(doodleDataUrl)
    let taskId: string | null = null
    try {
      taskId = await submitGenerate(stylePrompt, libraryId, personId)
      await pollUntilDone(taskId)
      const imageUrl = await getResultUrl(taskId)
      return { imageUrl, taskRef: libraryId }
    } catch (err) {
      // 失败路径双清理：cancel task 释放队列槽 + 删 library，防僵尸任务堆积到 10 并发上限
      if (taskId) cancelTask(taskId).catch(() => {})
      cleanupLibrary(libraryId).catch(() => {})
      throw err
    }
  },
}

/** 异步清理临时人物库（由路由层在成功后触发，不阻塞响应） */
export async function zzzStudioCleanup(taskRef: string | undefined): Promise<void> {
  if (!taskRef) return
  await cleanupLibrary(taskRef)
}
