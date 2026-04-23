import { NextRequest, NextResponse } from 'next/server'
import { uploadDoodle, submitGenerate, pollUntilDone, getResultUrl, cleanupLibrary } from '@/lib/zzz-studio'
import { generatePetInfo } from '@/lib/pet-generator'
import { randomPrompt } from '@/lib/style-prompts'
import type { Pet } from '@/types/pet'

const FALLBACK_PET: Omit<Pet, 'id' | 'imageUrl'> = {
  name: '神秘生命体',
  habitat: '末日废墟',
  personality: '神秘而古老',
  skills: ['虚空凝视', '时间感知', '意志具现'],
  hp: 100,
  story: '它从你的笔触中诞生，带着世界最后的记忆。',
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { imageDataUrl?: string }
  const { imageDataUrl } = body
  if (!imageDataUrl) {
    return NextResponse.json({ error: 'missing imageDataUrl' }, { status: 400 })
  }

  let libraryId: string | undefined

  try {
    // Step A: 上传涂鸦
    const { libraryId: libId, personId } = await uploadDoodle(imageDataUrl)
    libraryId = libId

    // Step B: 随机画风 + 提交生图
    const taskId = await submitGenerate(randomPrompt(), libraryId, personId)

    // Step C: 轮询等待完成
    await pollUntilDone(taskId)

    // Step D: 取结果图片 URL
    const imageUrl = await getResultUrl(taskId)

    // Step E: 清理临时库（异步，不阻塞响应）
    cleanupLibrary(libraryId).catch(() => {})
    libraryId = undefined

    // Step F: 生成宠物信息（变化区——后面换 AI）
    const petInfo = await generatePetInfo(imageUrl)

    const pet: Pet = { id: crypto.randomUUID(), ...petInfo, imageUrl }
    return NextResponse.json({ pet, imageUrl })

  } catch (err) {
    console.error('[/api/generate] error:', err)
    if (libraryId) cleanupLibrary(libraryId).catch(() => {})

    const pet: Pet = { id: crypto.randomUUID(), ...FALLBACK_PET }
    return NextResponse.json({ pet, imageUrl: null, fallback: true })
  }
}
