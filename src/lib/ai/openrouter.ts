import type { PetAttributes } from '@/types/pet'
import type { PetGenerator } from './index'
import { mockGenerator } from './mock'

const MODEL = 'anthropic/claude-opus-4.6'

const SYSTEM_PROMPT = `你是末日世界的造物主AI。根据图片中宠物的外形、颜色和气质，为它生成属性卡片。

只输出JSON，不含任何其他内容：
{
  "name": "2-4个汉字，有力量感或神秘感",
  "habitat": "栖息地（10字以内，末日世界设定）",
  "personality": "性格（8字以内）",
  "skills": ["技能一", "技能二", "技能三"],
  "hp": 整数（50到999之间）,
  "story": "诞生故事（20字以内，有情绪冲击力）"
}`

export const openRouterGenerator: PetGenerator = {
  async generate({ imageUrl, memoryHint }) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.warn('[ai.openrouter] OPENROUTER_API_KEY not set, using mock')
      return mockGenerator.generate({ imageUrl })
    }

    const prompt = memoryHint
      ? `${SYSTEM_PROMPT}\n\n额外背景：这只宠物继承了一段记忆：${memoryHint}。在 story 里隐含这段传承。`
      : SYSTEM_PROMPT

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                { type: 'text', text: prompt },
              ],
            },
          ],
          max_tokens: 400,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`OpenRouter ${res.status}: ${errBody}`)
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const raw = data?.choices?.[0]?.message?.content?.trim()
      if (!raw) throw new Error('empty response')

      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw
      const pet = JSON.parse(jsonStr) as PetAttributes
      if (!pet.name || !Array.isArray(pet.skills) || !pet.skills.length) {
        throw new Error('invalid pet schema')
      }
      return pet
    } catch (err) {
      console.error('[ai.openrouter] failed, fallback to mock:', err)
      return mockGenerator.generate({ imageUrl })
    }
  },
}
