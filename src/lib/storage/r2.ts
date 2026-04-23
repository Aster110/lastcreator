import { getMedia } from '@/lib/db/client'

const PUBLIC_DOMAIN = 'https://media.lastcreator.cc'

export interface R2PutOpts {
  contentType?: string
  cacheControl?: string
}

/**
 * 上传 Blob/ArrayBuffer 到 R2，返回 { key, publicUrl }
 */
export async function r2Put(
  key: string,
  body: ArrayBuffer | Blob | Uint8Array,
  opts: R2PutOpts = {},
): Promise<{ key: string; publicUrl: string }> {
  const media = getMedia()
  await media.put(key, body, {
    httpMetadata: {
      contentType: opts.contentType ?? 'application/octet-stream',
      cacheControl: opts.cacheControl ?? 'public, max-age=31536000, immutable',
    },
  })
  return { key, publicUrl: publicUrl(key) }
}

/**
 * 从外部 URL 下载后上传到 R2（用于持久化 AI 生成图片）
 */
export async function r2PutFromUrl(
  sourceUrl: string,
  key: string,
  opts: R2PutOpts = {},
): Promise<{ key: string; publicUrl: string }> {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`r2PutFromUrl: fetch ${sourceUrl} failed ${res.status}`)
  const contentType = opts.contentType ?? res.headers.get('content-type') ?? 'image/png'
  const buf = await res.arrayBuffer()
  return r2Put(key, buf, { ...opts, contentType })
}

export function publicUrl(key: string): string {
  return `${PUBLIC_DOMAIN}/${key}`
}

/**
 * 从 base64 data URL 上传
 */
export async function r2PutFromDataUrl(
  dataUrl: string,
  key: string,
): Promise<{ key: string; publicUrl: string }> {
  const [meta, base64] = dataUrl.split(',')
  const contentType = meta.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return r2Put(key, bytes, { contentType })
}
