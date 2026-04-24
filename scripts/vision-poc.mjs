#!/usr/bin/env node
/**
 * Claude Vision Verifier POC
 *
 * 用真实任务 prompt × ~/Desktop/图片素材/ 的真实图片，测试
 * Claude 能否准确判断"用户提交的照片是否满足任务要求"。
 *
 * 用法：node scripts/vision-poc.mjs [model]
 *   model 默认 anthropic/claude-opus-4.6
 *   也可以：anthropic/claude-sonnet-4-6
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy))

const MODEL = process.argv[2] ?? 'anthropic/claude-opus-4.6'

// 加载 .dev.vars（wrangler 风格 KEY=VALUE）
function loadDevVars() {
  const p = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '.dev.vars')
  if (!fs.existsSync(p)) return {}
  return Object.fromEntries(
    fs.readFileSync(p, 'utf-8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=')
        const k = l.slice(0, idx).trim()
        const v = l.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
        return [k, v]
      })
  )
}
const env = { ...loadDevVars(), ...process.env }
const apiKey = env.OPENROUTER_API_KEY
if (!apiKey) {
  console.error('缺 OPENROUTER_API_KEY（在 .dev.vars 或 env 里）')
  process.exit(1)
}

const DESKTOP = path.join(os.homedir(), 'Desktop', '图片素材')

const CASES = [
  // 应该 pass 的
  { img: '素材.jpg', prompt: '给我看你最爱的东西', hint: '任何有意义的物品或场景都行', expect: 'pass', note: '宽松 prompt' },
  { img: '净水器.jpg', prompt: '给我看你最爱的东西', hint: '任何有意义的物品或场景都行', expect: 'pass', note: '宽松 prompt 家电也算' },
  // 应该 reject 的（明显不符）
  { img: '净水器.jpg', prompt: '我饿了，帮我找点食物', hint: '图中包含食物、水果、饮品或任何可食用的东西', expect: 'reject', note: '净水器≠食物（边缘：净水算饮品？）' },
  { img: '中年男人.jpg', prompt: '我想看看外面的世界', hint: '图是户外场景，天空、街道、自然风光都行', expect: 'reject', note: '人像≠户外' },
  { img: '古装女.png', prompt: '我饿了，帮我找点食物', hint: '图中包含食物、水果、饮品或任何可食用的东西', expect: 'reject', note: '人物≠食物' },
  { img: '古装女.png', prompt: '我想看看外面的世界', hint: '图是户外场景，天空、街道、自然风光都行', expect: '?', note: '古装场景可能有户外元素，待观察' },
]

function toDataUrl(imgPath) {
  const buf = fs.readFileSync(imgPath)
  const ext = path.extname(imgPath).slice(1).toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

const SYSTEM = `你是宠物养成游戏的任务视觉验证员。用户要完成宠物派发的任务，会上传一张照片作为证据。

你的工作是判断这张照片是否满足任务要求。判断时要：
- 宽松但不纵容：用户拍个相关的都能过，但提交明显不符（例如要求"食物"但提交了"室内墙面"）必须拒
- reason 要具体：说明图里看到什么，为什么判这样
- 中文输出

只输出 JSON，不要 markdown，不要前后缀：
{"pass": true|false, "confidence": 0-1 小数, "reason": "30字内具体理由"}`

async function verify(img, prompt, hint) {
  const imgPath = path.join(DESKTOP, img)
  if (!fs.existsSync(imgPath)) return { error: `img not found: ${imgPath}` }
  const dataUrl = toDataUrl(imgPath)

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: `任务要求：「${prompt}」\n通过条件：${hint}\n\n请判断这张图是否满足。` },
        ],
      },
    ],
    max_tokens: 200,
  }

  const t0 = Date.now()
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const dt = Date.now() - t0

  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${await res.text()}`, dt }
  }
  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? ''
  const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw
  try {
    const parsed = JSON.parse(jsonStr)
    return { ...parsed, dt, raw, usage: data.usage }
  } catch (err) {
    return { error: `parse failed: ${err.message}`, raw, dt }
  }
}

async function main() {
  console.log(`\n🧪 Vision Verifier POC — model: ${MODEL}`)
  console.log(`   proxy: ${proxy ?? '(none)'}`)
  console.log(`   素材目录：${DESKTOP}\n`)

  const results = []
  for (const c of CASES) {
    process.stdout.write(`  [${c.img}] × "${c.prompt}" ... `)
    const r = await verify(c.img, c.prompt, c.hint)
    const verdict = r.error ? '❌ERR' : r.pass ? '✅pass' : '❌reject'
    const match = r.error
      ? '—'
      : c.expect === '?'
      ? '?'
      : (r.pass && c.expect === 'pass') || (!r.pass && c.expect === 'reject')
      ? '✓'
      : '✗'
    console.log(`${verdict} [${match}] (${r.dt}ms)`)
    results.push({ ...c, ...r, verdict, match })
  }

  console.log('\n\n## 结果表\n')
  console.log('| 图 | 任务 | 期望 | 判定 | match | confidence | reason | 用时 |')
  console.log('|---|---|---|---|---|---|---|---|')
  for (const r of results) {
    const reason = r.error ? `ERR: ${r.error.slice(0, 40)}` : (r.reason ?? '').replace(/\|/g, '·')
    console.log(`| ${r.img} | ${r.prompt} | ${r.expect} | ${r.verdict} | ${r.match} | ${r.confidence ?? '-'} | ${reason} | ${r.dt}ms |`)
  }

  const hits = results.filter(r => r.match === '✓').length
  const misses = results.filter(r => r.match === '✗').length
  const unknowns = results.filter(r => r.match === '?').length
  const errs = results.filter(r => r.error).length
  console.log(`\n匹配期望: ${hits}/${results.length - unknowns}（${unknowns} 个未定；${errs} 个错）`)

  const totalInput = results.reduce((s, r) => s + (r.usage?.prompt_tokens ?? 0), 0)
  const totalOutput = results.reduce((s, r) => s + (r.usage?.completion_tokens ?? 0), 0)
  console.log(`token 消耗：input=${totalInput} output=${totalOutput}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
