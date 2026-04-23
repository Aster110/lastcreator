export interface ImageProvider {
  /** 涂鸦 base64 + 风格 prompt → 图像 URL（可能是提供商 CDN） */
  generateFromDoodle(doodleDataUrl: string, stylePrompt: string): Promise<{
    imageUrl: string
    /** 提供商内部任务 id，用于清理或重试 */
    taskRef?: string
  }>
}

export interface ImagePersistor {
  /** 从外部 URL 拉图落 R2，返回 R2 key + publicUrl */
  persist(sourceUrl: string, petId: string): Promise<{ r2Key: string; publicUrl: string }>
}

export { zzzStudioProvider, zzzStudioCleanup } from './zzz-studio'
export { r2Persistor } from './r2-persist'
