#!/usr/bin/env node
/**
 * Playwright e2e 验收脚本：lastcreator.cc v2 主链路
 *
 * 验证流程：
 *   1. 打开首页 → HomeScreen 渲染 OK
 *   2. 点"开始召唤" → 进入画布
 *   3. 在 canvas 上画一条线 → 点确认
 *   4. 等 PetCard 出现（最长 30s）
 *   5. 断言 PetCard 有 name、skills、imageUrl
 *   6. 调 /api/pets 验证 D1 有数据
 *   7. 如果有 imageUrl，HEAD media.lastcreator.cc 验证 R2 持久化
 *
 * 用法：node scripts/e2e-smoke.mjs [baseUrl]
 *       默认 baseUrl = https://lastcreator.cc
 */
import { chromium, devices } from 'playwright'

const BASE = process.argv[2] ?? 'https://lastcreator.cc'

async function main() {
  console.log(`🎯 e2e target: ${BASE}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    // 持久 cookie：同 context 模拟"同一用户"，验证 D1 image list 读到新宠物
  })
  const page = await context.newPage()

  // 收集 console 日志便于排错
  const logs = []
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`))

  try {
    console.log('\n📍 Step 1: HomeScreen')
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForSelector('text=神笔', { timeout: 5000 })
    console.log('   ✅ HomeScreen 渲染')

    console.log('\n📍 Step 2: 进入画布')
    await page.getByRole('button', { name: /开始召唤/ }).click()
    await page.waitForSelector('canvas', { timeout: 5000 })
    console.log('   ✅ DrawingCanvas 渲染')

    console.log('\n📍 Step 3: 在 canvas 上画一笔')
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no bounding box')
    // 用 touchscreen 模拟手指画一条斜线
    const steps = 20
    const startX = box.x + box.width * 0.3
    const startY = box.y + box.height * 0.3
    const endX = box.x + box.width * 0.7
    const endY = box.y + box.height * 0.7
    // Playwright 的 page.touchscreen 需要 hasTouch context（iPhone device 自带）
    // 先发 touchstart，再 touchmove 多次，最后 touchend
    await page.dispatchEvent('canvas', 'touchstart', {
      touches: [{ clientX: startX, clientY: startY, identifier: 1 }],
    })
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps)
      const y = startY + (endY - startY) * (i / steps)
      await page.dispatchEvent('canvas', 'touchmove', {
        touches: [{ clientX: x, clientY: y, identifier: 1 }],
      })
    }
    await page.dispatchEvent('canvas', 'touchend', { touches: [] })
    // fallback：再用鼠标事件画一下（某些 hook 实现可能只监听 mouse）
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps)
      const y = startY + (endY - startY) * (i / steps)
      await page.mouse.move(x, y, { steps: 2 })
    }
    await page.mouse.up()
    console.log('   ✅ 画笔输入完成')

    console.log('\n📍 Step 4: 点召唤按钮')
    // 底部中央的 ✓ 按钮
    await page.getByRole('button', { name: '✓' }).click()

    console.log('\n📍 Step 5: 等待 PetCard（最长 60s）')
    // LoadingScreen 显示"正在解析你的咒文…"
    await page.waitForSelector('text=正在解析你的咒文', { timeout: 5000 }).catch(() => {
      console.log('   ⚠️  LoadingScreen 没出现（可能秒出），继续等 result')
    })
    // 等"再召唤一只"按钮（PetCard 结果页）
    await page.waitForSelector('text=再召唤一只', { timeout: 60000 })
    console.log('   ✅ PetCard 出现')

    console.log('\n📍 Step 6: 断言 PetCard 内容')
    const resultText = await page.locator('body').innerText()
    const hasHp = /HP/.test(resultText)
    const hasHabitat = /栖息地/.test(resultText)
    const hasSkills = /技能/.test(resultText)
    console.log(`   HP: ${hasHp ? '✅' : '❌'} / 栖息地: ${hasHabitat ? '✅' : '❌'} / 技能: ${hasSkills ? '✅' : '❌'}`)
    if (!hasHp || !hasHabitat || !hasSkills) throw new Error('PetCard 缺字段')

    // 提取宠物图的 src
    const imgSrc = await page.locator('img[alt]').first().getAttribute('src').catch(() => null)
    console.log(`   图片 URL: ${imgSrc ?? '（无图 / fallback）'}`)

    console.log('\n📍 Step 7: /api/pets 验证 D1 有数据')
    const listRes = await context.request.get(`${BASE}/api/pets`)
    console.log(`   /api/pets status: ${listRes.status()}`)
    const listJson = await listRes.json()
    const count = listJson?.pets?.length ?? 0
    console.log(`   宠物数量: ${count}`)
    if (count < 1) throw new Error('/api/pets 未返回刚创建的宠物')
    const first = listJson.pets[0]
    console.log(`   最新宠物: id=${first.id} name="${first.name}" stage=${first.stage}`)
    if (!first.id?.startsWith('p_')) throw new Error('pet.id 未按 p_ 前缀')

    if (first.imageUrl) {
      console.log('\n📍 Step 8: HEAD R2 public URL 验证持久化')
      const headRes = await context.request.fetch(first.imageUrl, { method: 'HEAD' })
      console.log(`   ${first.imageUrl} → ${headRes.status()}`)
      if (headRes.status() !== 200) throw new Error(`R2 image not accessible: ${headRes.status()}`)
    } else {
      console.log('\n⚠️  fallback 宠物（无 imageUrl），跳过 R2 验证')
    }

    console.log('\n📍 Step 9: GET /api/world 验证世界状态')
    const worldRes = await context.request.get(`${BASE}/api/world`)
    const world = await worldRes.json()
    console.log(`   末日第 ${world.dayCount} 天 / ${world.petCount} 个生命 / 复苏 ${world.totalHp}`)
    if (world.dayCount < 1 || world.petCount < 1) throw new Error('world state invalid')

    console.log('\n📍 Step 10: GET /api/pets/[id] 单只查询')
    const singleRes = await context.request.get(`${BASE}/api/pets/${first.id}`)
    console.log(`   /api/pets/${first.id} status: ${singleRes.status()}`)
    const singleJson = await singleRes.json()
    if (singleJson.pet?.id !== first.id) throw new Error('single pet id mismatch')

    console.log('\n📍 Step 11: 打开 /me 页 验证档案渲染')
    await page.goto(`${BASE}/me`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForSelector('text=末日档案', { timeout: 5000 })
    await page.waitForSelector(`text=${first.name}`, { timeout: 5000 })
    console.log('   ✅ 档案渲染 + 新宠物在列表')

    console.log('\n\n✅ e2e 全部通过')
  } catch (err) {
    console.error('\n❌ e2e 失败:', err.message)
    console.error('\n最近 console 日志:')
    logs.slice(-20).forEach(l => console.error('  ' + l))
    // dump screenshot
    await page.screenshot({ path: '/tmp/e2e-fail.png', fullPage: true }).catch(() => {})
    console.error('截图 → /tmp/e2e-fail.png')
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main()
