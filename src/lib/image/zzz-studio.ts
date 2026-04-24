import type { ImageProvider } from './index'

const BASE = 'https://imagestudio.riveroll.top'
// poll 策略：先等 15s 再轮询（图生图通常要 15-30s 才出结果，早 poll 纯浪费 quota）
// 前端两段视频 + waitConfirm 总时长 ≥17s，用户感知无延迟
const POLL_INITIAL_DELAY_MS = 15_000
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 50_000
// submit 429 退避：瞬时限流多数 2-5s 能恢复
const SUBMIT_RETRY_DELAYS_MS = [1_000, 3_000, 7_000]

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

export const zzzStudioProvider: ImageProvider = {
  async generateFromDoodle(doodleDataUrl, stylePrompt) {
    const { libraryId, personId } = await uploadDoodle(doodleDataUrl)
    try {
      const taskId = await submitGenerate(stylePrompt, libraryId, personId)
      await pollUntilDone(taskId)
      const imageUrl = await getResultUrl(taskId)
      return { imageUrl, taskRef: libraryId }  // taskRef 设为 libraryId 方便清理
    } catch (err) {
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
