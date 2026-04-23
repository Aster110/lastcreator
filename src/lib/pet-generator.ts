import type { Pet } from '@/types/pet'

// 变化区接口：Pet 结构扩展时只改这里和 Pet 类型
export type PetGeneratorFn = (imageUrl: string) => Promise<Omit<Pet, 'id' | 'imageUrl'>>

const MODEL = 'anthropic/claude-sonnet-4-6'

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

const MOCK_PETS: Array<Omit<Pet, 'id' | 'imageUrl'>> = [
  {
    name: '烈焰球兽',
    habitat: '火域熔炉',
    personality: '暴躁但忠诚',
    skills: ['火焰冲击', '熔岩护盾', '爆裂突进'],
    hp: 387,
    story: '它诞生于世界燃尽后的第一缕火焰',
  },
  {
    name: '幽影爪',
    habitat: '废土裂缝深处',
    personality: '沉默狡黠',
    skills: ['影遁', '暗爪撕裂', '恐惧凝视'],
    hp: 512,
    story: '凡是被它盯上的猎物，从未逃脱',
  },
  {
    name: '铁壳守卫',
    habitat: '末日废土要塞',
    personality: '沉默且坚定',
    skills: ['钢铁意志', '废土重生', '残影冲锋'],
    hp: 731,
    story: '世界崩塌后，它选择守护最后一粒种子',
  },
]

function randomMock(): Omit<Pet, 'id' | 'imageUrl'> {
  return MOCK_PETS[Math.floor(Math.random() * MOCK_PETS.length)]
}

export const generatePetInfo: PetGeneratorFn = async (imageUrl: string) => {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn('[pet-generator] OPENROUTER_API_KEY not set, using mock')
    return randomMock()
  }

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
              { type: 'text', text: SYSTEM_PROMPT },
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

    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const raw = data?.choices?.[0]?.message?.content?.trim()
    if (!raw) throw new Error('empty response')

    // 提取 JSON（防止模型在代码块里包裹）
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw
    const pet = JSON.parse(jsonStr) as Omit<Pet, 'id' | 'imageUrl'>
    if (!pet.name || !Array.isArray(pet.skills) || !pet.skills.length) {
      throw new Error('invalid pet schema')
    }
    return pet
  } catch (err) {
    console.error('[pet-generator] OpenRouter failed, fallback to mock:', err)
    return randomMock()
  }
}
