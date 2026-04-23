/**
 * 本地测试：调用 OpenRouter claude-opus-4.6，验证 pet JSON 生成
 * 运行：node scripts/test-pet-generator.mjs [图片路径]
 * 默认使用 P101 测试素材
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const MODEL = 'anthropic/claude-opus-4.6'
const API_KEY = process.env.OPENROUTER_API_KEY

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

async function main() {
  if (!API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set')
    process.exit(1)
  }

  // 读取测试图片（优先命令行参数，否则用默认测试图）
  const imgPath = process.argv[2]
    ?? '/Users/aster/AIproject/mylife/2-Projects/P101-hackon/output/素材/flame-cute-img2img-test.jpg'

  console.log(`📸 测试图片: ${imgPath}`)

  const imgBytes = fs.readFileSync(imgPath)
  const ext = path.extname(imgPath).slice(1).replace('jpg', 'jpeg')
  const base64 = imgBytes.toString('base64')
  const dataUrl = `data:image/${ext};base64,${base64}`

  console.log(`🤖 调用模型: ${MODEL}`)
  console.log('⏳ 请求中...\n')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: SYSTEM_PROMPT },
          ],
        },
      ],
      max_tokens: 400,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`❌ OpenRouter 报错 ${res.status}:\n${err}`)
    process.exit(1)
  }

  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content?.trim()

  console.log('📦 原始响应:')
  console.log(raw)
  console.log()

  // 解析 JSON
  const jsonStr = raw?.match(/\{[\s\S]*\}/)?.[0] ?? raw
  try {
    const pet = JSON.parse(jsonStr)

    console.log('✅ 解析成功:')
    console.log(`  名字: ${pet.name}`)
    console.log(`  栖息地: ${pet.habitat}`)
    console.log(`  性格: ${pet.personality}`)
    console.log(`  HP: ${pet.hp}`)
    console.log(`  技能: ${pet.skills?.join(' / ')}`)
    console.log(`  故事: ${pet.story}`)

    // 字段校验
    const required = ['name', 'habitat', 'personality', 'skills', 'hp', 'story']
    const missing = required.filter(k => !pet[k])
    if (missing.length) console.warn(`⚠️  缺字段: ${missing.join(', ')}`)
    else console.log('\n✅ 字段完整，测试通过')
  } catch (e) {
    console.error('❌ JSON 解析失败:', e.message)
    console.error('原始内容:', raw)
  }
}

main()
