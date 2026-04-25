/**
 * v3.9.2 (Phase C): MemoryExtractor —— 从 verified 照片 extract 主题/物件 tags
 *
 * 设计：
 * - 输入：taskId + petId + ownerId + imageUrl + verdict（上下文）
 * - 输出：MemoryRecord[]（通常 1 条 preference）
 * - 仅 photo 类提交触发（涂鸦噪音多）
 * - 失败 silent（不阻塞主流程；由 subscriber 兜底）
 *
 * v1 实现：haiku-4.5 + 简单 vision prompt → tags
 * v2 计划：换更强模型 / 加 embedding / 跨宠物聚类
 *
 * §8 数据层铁律：本模块只产出 MemoryCreate，不直接写 DB（subscriber 负责调 repo）
 */
import type { MemoryCreate, MemoryPayload } from '@/types/memory'
import type { TaskVerdict } from '@/types/task'

const MODEL = 'anthropic/claude-haiku-4.5'
const TIMEOUT_MS = 5_000

const SYSTEM = `你是宠物养成游戏的偏好分析师。用户上传照片完成任务时，你要从图里识别出"用户喜欢/经常拍到的主题"。
输出 3-6 个 tags（中文，每条 1-4 字），代表图里的主体物件 / 场景 / 风格。

例：
- 图：一只趴在沙发上的猫 → ["猫", "沙发", "室内", "宠物"]
- 图：一杯热咖啡和书 → ["咖啡", "书", "桌面", "暖色调", "饮品"]
- 图：街边树叶 → ["树叶", "户外", "自然", "植物"]

输出 JSON 严格如下，不带 markdown：
{"tags": ["...", "..."], "confidence": 0.0-1.0}`

export interface ExtractInput {
  taskId: string
  petId: string
  ownerId: string
  imageUrl: string
  verdict: TaskVerdict
}

export interface MemoryExtractor {
  /**
   * v1: 失败时返回空数组（不抛错；subscriber 据此 short-circuit）
   * v2: 可能返多条（preference + 衍生 inference）
   */
  extract(input: ExtractInput): Promise<MemoryCreate[]>
}

function parseTags(raw: string): { tags: string[]; confidence: number } | null {
  try {
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw
    const parsed = JSON.parse(jsonStr) as { tags?: unknown; confidence?: unknown }
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter(t => typeof t === 'string').map(t => String(t).trim()).filter(Boolean)
      : []
    if (tags.length === 0) return null
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5
    return { tags: tags.slice(0, 6), confidence }
  } catch {
    return null
  }
}

export const haikuMemoryExtractor: MemoryExtractor = {
  async extract(input) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return []

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: input.imageUrl } },
                { type: 'text', text: '请分析这张图，给出 3-6 个 tags。' },
              ],
            },
          ],
          max_tokens: 150,
        }),
      })
      if (!res.ok) return []
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const raw = data?.choices?.[0]?.message?.content?.trim() ?? ''
      const parsed = parseTags(raw)
      if (!parsed) return []

      const payload: MemoryPayload = {
        kind: 'preference',
        tags: parsed.tags,
        confidence: parsed.confidence,
        taskId: input.taskId,
      }
      const record: MemoryCreate = {
        petId: input.petId,
        ownerId: input.ownerId,
        kind: 'preference',
        source: 'task',
        sourceRef: input.taskId,
        payload,
      }
      return [record]
    } catch {
      return []
    } finally {
      clearTimeout(timer)
    }
  },
}
