import type { Task, TaskProof, TaskVerdict } from '@/types/task'

export interface TaskVerifier {
  verify(task: Task, proof: TaskProof): Promise<TaskVerdict>
}

// ========== 1. AlwaysPass（兜底 + 测试模式）==========

/** 永远 pass + completion=1。测试和 API 降级时用 */
export const alwaysPassVerifier: TaskVerifier = {
  async verify(task, proof) {
    return {
      pass: true,
      completion: 1,
      confidence: 1,
      reason: `MVP 模式：任务 "${task.prompt}" 已接受你的${proof.kind === 'photo' ? '照片' : '涂鸦'}`,
    }
  },
}

// ========== 2. Claude Vision（主实现）==========

const VISION_MODEL = 'anthropic/claude-opus-4.6'

const VISION_SYSTEM = `你是宠物养成游戏的任务视觉验证员。用户要完成宠物派发的任务，会上传一张照片或涂鸦作为证据。

你的工作是判断这张图是否满足任务要求，并给出完成度评分。判断时要：
- 宽松但不纵容：拍个相关的都能过，但明显不符（例如要求"食物"但提交了"墙面"）必须拒
- completion 要校准：0.0 = 完全不符；0.5 = 勉强相关；1.0 = 完美匹配任务描述
- pass 规则：completion >= 0.4 即 pass（给勉强完成的人一点奖励）
- reason 要具体：说明图里看到什么，为什么这样评

只输出 JSON，不要 markdown，不要前后缀：
{"pass": true|false, "completion": 0.0-1.0, "confidence": 0.0-1.0, "reason": "30字内具体理由"}`

function buildUserPrompt(task: Task): string {
  return `任务要求：「${task.prompt}」
通过条件：${task.verifyHint}

请查看附图，判断是否满足并给出完成度。`
}

/** 降级 verdict（API 出错或 parse 失败时用） */
function fallbackVerdict(note: string): TaskVerdict {
  return {
    pass: true,
    completion: 0.5,
    confidence: 0,
    reason: `降级模式接受（${note}）`,
  }
}

export const claudeVisionVerifier: TaskVerifier = {
  async verify(task, proof) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return fallbackVerdict('no api key')

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            { role: 'system', content: VISION_SYSTEM },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: proof.imageUrl } },
                { type: 'text', text: buildUserPrompt(task) },
              ],
            },
          ],
          max_tokens: 200,
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return fallbackVerdict(`http ${res.status}: ${body.slice(0, 40)}`)
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const raw = data?.choices?.[0]?.message?.content?.trim() ?? ''
      if (!raw) return fallbackVerdict('empty response')

      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw
      const parsed = JSON.parse(jsonStr) as {
        pass?: unknown
        completion?: unknown
        confidence?: unknown
        reason?: unknown
      }

      const completion = Math.max(0, Math.min(1, Number(parsed.completion) || 0))
      const pass = Boolean(parsed.pass)
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : undefined
      const reason = String(parsed.reason ?? '').slice(0, 100) || '无理由'

      return { pass, completion, confidence, reason, rawResponse: raw }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return fallbackVerdict(`error: ${msg.slice(0, 60)}`)
    }
  },
}

// ========== 3. 选择器 ==========

/**
 * 顶层 verifier 选择器。
 * - 默认 claudeVisionVerifier（已内置 fallback）
 * - VERIFIER_MODE=always_pass → 切回 alwaysPassVerifier（测试/紧急降级）
 */
export function pickVerifier(): TaskVerifier {
  if (process.env.VERIFIER_MODE === 'always_pass') return alwaysPassVerifier
  return claudeVisionVerifier
}
