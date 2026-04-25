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
const VISION_TIMEOUT_MS = 30_000

const VISION_SYSTEM = `你是宠物养成游戏的任务视觉验证员。用户上传照片/涂鸦作为任务证据。

判断标准：
- 宽松但不纵容：相关就过；明显不符（要"食物"得"墙面"）必须拒
- completion 校准：0.0=完全不符 / 0.5=勉强相关 / 1.0=完美匹配
- pass 规则：completion >= 0.4 即 pass

reason 写作要求（关键，治"用户被毙不知道为什么"的痛点）：
- 必须具体说出图里看到什么主体（"看到了一只猫"/"看到了一杯咖啡"）
- 如果 reject，必须说为什么：图里是 X，但任务要的是 Y
- 如果 reject，建议下次怎么拍：可以试试拍 Z（具体描述）
- 60字内，禁止"不符合要求"这种空话

reason 示例（reject）：
- "看到了一面墙，但任务要的是食物。可以试试拍冰箱里的水果或桌上的零食。"
- "图里是手，没看见明确的'温暖光源'。试试拍一盏台灯或蜡烛。"

reason 示例（pass）：
- "看到了一杯热咖啡，正好是温暖的暖色调。"

只输出 JSON，不要 markdown，不要前后缀：
{"pass": true|false, "completion": 0.0-1.0, "confidence": 0.0-1.0, "reason": "..."}`

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

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), VISION_TIMEOUT_MS)

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
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
      if (err instanceof Error && err.name === 'AbortError') {
        return fallbackVerdict(`timeout ${VISION_TIMEOUT_MS / 1000}s`)
      }
      const msg = err instanceof Error ? err.message : String(err)
      return fallbackVerdict(`error: ${msg.slice(0, 60)}`)
    } finally {
      clearTimeout(timer)
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
