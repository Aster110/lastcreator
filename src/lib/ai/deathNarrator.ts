/**
 * v3.9.3 (Phase D): DeathNarrator —— 宠物死亡/放生时生成"它的一生"故事
 *
 * 设计：
 * - 输入：pet + 该宠物的所有 done tasks + 该 owner 在该 pet 名下的 memories（preference）+ cause
 * - 输出：{ title, body, modelId }
 * - 用 opus-4.6（更强叙事）；30s 超时
 *
 * 失败时返回降级 stub（不阻塞主流程，由 subscriber 兜底）。
 *
 * §8 数据层铁律：本模块只产出 narrative payload，不直接写 DB（subscriber 调 repo）
 */
import type { FullPet } from '@/types/pet'
import type { Task } from '@/types/task'
import type { MemoryRecord } from '@/types/memory'

const MODEL = 'anthropic/claude-opus-4.6'
const TIMEOUT_MS = 30_000

const SYSTEM = `你是末日世界的叙事者。一只小生命的旅程刚刚结束，请为它写一段"它的一生"。

要求：
- title：10 字内的标题（如"灰鬃的最后一日"/"光之回声"）
- body：80-150 字，叙事感强，**融入**它的名字、性格、做过的任务亮点、喜欢的东西、结束的方式
- 文风：末日 + 温暖 + 一点点感伤，不矫情
- 禁止用"它走完了一生"等套话；要具体到事件和细节

输出 JSON 严格如下，不带 markdown：
{"title": "...", "body": "..."}`

export interface NarrateInput {
  pet: FullPet
  tasks: Task[]            // 该宠物的所有 done 任务
  memories: MemoryRecord[] // preference 类居多
  cause: 'died' | 'released'
}

export interface NarrateOutput {
  title: string
  body: string
  modelId: string
}

export interface DeathNarrator {
  narrate(input: NarrateInput): Promise<NarrateOutput>
}

function buildUserPrompt(input: NarrateInput): string {
  const { pet, tasks, memories, cause } = input
  const taskLines = tasks
    .filter(t => t.status === 'done')
    .slice(0, 10)
    .map(t => `- 「${t.prompt}」（完成）`)
    .join('\n') || '（没做过任务）'

  const tagSet = new Set<string>()
  for (const m of memories) {
    if (m.payload.kind === 'preference') {
      for (const tag of m.payload.tags) tagSet.add(tag)
    }
  }
  const tags = [...tagSet].slice(0, 8).join('、') || '（暂无偏好记录）'

  const causeText = cause === 'released' ? '被主人放生回了世界' : '寿命到期，安静地离开了'

  return `宠物档案：
- 名字：${pet.name}
- 性格：${pet.personality}
- 栖息地：${pet.habitat}
- 元素：${pet.element ?? '未分配'}
- 阶段：${pet.stage}
- 诞生故事：${pet.story}

它做过的任务：
${taskLines}

它喜欢的东西（由它陪你完成的任务推断）：${tags}

结束方式：${causeText}

请按 SYSTEM 规则输出 JSON。`
}

function fallbackOutput(pet: FullPet, cause: 'died' | 'released'): NarrateOutput {
  const verb = cause === 'released' ? '回到了风里' : '安静地睡去了'
  return {
    title: `${pet.name}的最后一日`,
    body: `${pet.name}是一只${pet.personality}的小生命，在${pet.habitat}陪伴主人走过了一段时间，最终${verb}。`,
    modelId: 'fallback',
  }
}

export const opusDeathNarrator: DeathNarrator = {
  async narrate(input) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return fallbackOutput(input.pet, input.cause)

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
            { role: 'user', content: buildUserPrompt(input) },
          ],
          max_tokens: 400,
        }),
      })
      if (!res.ok) return fallbackOutput(input.pet, input.cause)

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const raw = data?.choices?.[0]?.message?.content?.trim() ?? ''
      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0]
      if (!jsonStr) return fallbackOutput(input.pet, input.cause)
      const parsed = JSON.parse(jsonStr) as { title?: unknown; body?: unknown }
      const title = String(parsed.title ?? '').slice(0, 30).trim() ||
        `${input.pet.name}的最后一日`
      const body = String(parsed.body ?? '').slice(0, 400).trim() ||
        fallbackOutput(input.pet, input.cause).body
      return { title, body, modelId: MODEL }
    } catch {
      return fallbackOutput(input.pet, input.cause)
    } finally {
      clearTimeout(timer)
    }
  },
}
