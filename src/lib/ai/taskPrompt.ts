/**
 * v3.7: 任务 prompt AI 填空调用。
 * 仿 lib/ai/openrouter.ts 结构：try fetch → parse JSON → throw on fail。
 * assigner 调用时必须自备 try/catch 兜底到 defaultPrompt。
 */
import type { PromptContext } from '@/lib/game/tasks/taskPrompt'

const MODEL = 'anthropic/claude-haiku-4.5'  // 用 haiku 更快更便宜，prompt 填空不需要 opus
const TIMEOUT_MS = 5_000
const MAX_TOKENS = 200

export interface FilledTask {
  prompt: string      // 最终任务文案
  verifyHint: string  // 通常照抄 template.verifyHint；AI 可微调
}

const SYSTEM_PROMPT_HEADER = `你是末日世界的造物主之声，帮一只宠物向玩家派任务。请根据下面的上下文，把骨架里的 {slot} 替换成符合宠物性格+元素+时段氛围的具体内容。

硬性要求：
- prompt 用宠物第一人称（10-20 字，有情感）
- 你的填充必须落在 verifyHint 的范围内（AI 视觉要判得出）
- 不要编造难以被照片/涂鸦验证的任务（如"拍你的心情"）
- 只输出 JSON：{"prompt": "...", "verifyHint": "..."}
- verifyHint 照抄模板原文即可，如果要微调必须保持范围不变

禁止：超出 verifyHint 范围；抽象情绪词；没有视觉锚点的要求`

function buildUserMessage(ctx: PromptContext): string {
  return [
    `宠物信息：`,
    `- 名字：${ctx.pet.name}`,
    `- 性格：${ctx.pet.personality}`,
    `- 元素：${ctx.pet.element ?? '（无属性）'}`,
    `- 阶段：${ctx.pet.stage}`,
    ``,
    `世界状态：末日第 ${ctx.world.dayCount} 天，当前是 ${ctx.nowSlot}`,
    ``,
    `任务类型：${ctx.template.kind === 'photo' ? '拍照任务' : '涂鸦任务'}`,
    `骨架：${ctx.template.promptSkeleton}`,
    `可替换 slots：${ctx.template.slots.join(', ')}`,
    `验证范围（必须遵守）：${ctx.template.verifyHint}`,
  ].join('\n')
}

/**
 * 调 openrouter 生成填空 prompt。
 * - 成功：返回 { prompt, verifyHint }
 * - 失败（网络 / JSON / timeout / 无 API key）：throw，让调用方 fallback
 */
export const taskPromptAI = {
  async fill(ctx: PromptContext): Promise<FilledTask> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT_HEADER },
            { role: 'user', content: buildUserMessage(ctx) },
          ],
          max_tokens: MAX_TOKENS,
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`)
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const raw = data?.choices?.[0]?.message?.content?.trim()
      if (!raw) throw new Error('empty response')

      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw
      const parsed = JSON.parse(jsonStr) as Partial<FilledTask>

      if (!parsed.prompt || typeof parsed.prompt !== 'string') {
        throw new Error('invalid JSON schema: missing prompt')
      }

      return {
        prompt: parsed.prompt.trim(),
        verifyHint:
          (typeof parsed.verifyHint === 'string' && parsed.verifyHint.trim()) ||
          ctx.template.verifyHint,
      }
    } finally {
      clearTimeout(timer)
    }
  },
}
