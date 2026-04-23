import { r2PutFromUrl } from '@/lib/storage/r2'
import type { ImagePersistor } from './index'

export const r2Persistor: ImagePersistor = {
  async persist(sourceUrl, petId) {
    const key = `pets/${petId}/image.png`
    const { key: r2Key, publicUrl } = await r2PutFromUrl(sourceUrl, key, { contentType: 'image/png' })
    return { r2Key, publicUrl }
  },
}
