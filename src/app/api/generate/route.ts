import { NextRequest, NextResponse } from 'next/server'
import { ensureSubscribers } from '@/lib/events/subscribers'
import { resolveUser } from '@/lib/identity'
import { prefixedId } from '@/lib/db/nanoid'
import { zzzStudioProvider, zzzStudioCleanup, r2Persistor } from '@/lib/image'
import { openRouterGenerator } from '@/lib/ai'
import { pickStyle } from '@/lib/style-prompts'
import { createPet } from '@/lib/repo/pets'
import { initPetState } from '@/lib/repo/petState'
import { calcInitialExpiresAt } from '@/lib/game/lifecycle'
import { r2PutFromDataUrl } from '@/lib/storage/r2'
import { emit } from '@/lib/events'
import { getCtx } from '@/lib/db/client'
import type { DisplayPet } from '@/types/pet'

const FALLBACK: DisplayPet = {
  id: '',
  name: '神秘生命体',
  habitat: '末日废墟',
  personality: '神秘而古老',
  skills: ['虚空凝视', '时间感知', '意志具现'],
  hp: 100,
  story: '它从你的笔触中诞生，带着世界最后的记忆。',
  imageUrl: null,
}

export async function POST(req: NextRequest) {
  ensureSubscribers()
  const body = (await req.json()) as { imageDataUrl?: string; memoryHint?: string }
  const { imageDataUrl, memoryHint } = body
  if (!imageDataUrl) {
    return NextResponse.json({ error: 'missing imageDataUrl' }, { status: 400 })
  }

  const petId = prefixedId('p')
  let taskRef: string | undefined
  let ctx: ExecutionContext | null = null
  try {
    ctx = getCtx()
  } catch {
    // 极少数情况下 cloudflare context 还没 bind，宽容处理
  }

  try {
    const { userId } = await resolveUser()

    // 并行：涂鸦存 R2（备份，可失败）+ zzz 图生图（必需）
    // 属性抽取必须在图生图前，因为 prompt 里含属性约束
    const style = pickStyle()
    const doodleKey = `pets/${petId}/doodle.png`
    const [doodleResult, imageResult] = await Promise.all([
      r2PutFromDataUrl(imageDataUrl, doodleKey).catch(err => {
        console.warn('[generate] doodle save failed (non-fatal):', err)
        return null
      }),
      zzzStudioProvider.generateFromDoodle(imageDataUrl, style.prompt),
    ])
    taskRef = imageResult.taskRef

    // 持久化生成图到 R2
    const { r2Key: imageR2Key, publicUrl: imageUrl } = await r2Persistor.persist(
      imageResult.imageUrl,
      petId,
    )

    // 清理 zzz 临时库（非阻塞）
    if (ctx) ctx.waitUntil(zzzStudioCleanup(taskRef))

    // LLM 生成属性
    const attrs = await openRouterGenerator.generate({ imageUrl, memoryHint })

    const pet = await createPet({
      id: petId,
      ownerId: userId,
      ...attrs,
      imageR2Key,
      imageUrl,
      imageOriginUrl: imageResult.imageUrl,
      doodleR2Key: doodleResult?.key ?? null,
      element: style.id,
      exp: 0,
      stage: '幼年',
      status: 'alive',
    })

    // v3.2：初始化 pets_state + 生命倒计时
    const lifeExpiresAt = calcInitialExpiresAt(attrs.lifeBonusMinutes ?? 0)
    await initPetState(pet.id, { hp: pet.hp, stage: '幼年', status: 'alive', lifeExpiresAt })

    emit({ type: 'pet.born', petId: pet.id, ownerId: userId, at: Date.now() })

    const display: DisplayPet = {
      id: pet.id,
      name: pet.name,
      habitat: pet.habitat,
      personality: pet.personality,
      skills: pet.skills,
      hp: pet.hp,
      story: pet.story,
      imageUrl: pet.imageUrl,
      stage: pet.stage,
      status: 'alive',
      createdAt: pet.createdAt,
      lifeExpiresAt,
      completedTaskCount: 0,
      element: pet.element ?? null,
    }
    return NextResponse.json({ pet: display })
  } catch (err) {
    console.error('[/api/generate] error:', err)
    if (taskRef && ctx) ctx.waitUntil(zzzStudioCleanup(taskRef))
    const debugInfo =
      process.env.NODE_ENV !== 'production'
        ? { error: err instanceof Error ? err.message : String(err) }
        : {}
    return NextResponse.json({ pet: { ...FALLBACK, id: petId }, fallback: true, ...debugInfo })
  }
}
