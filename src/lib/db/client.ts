import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * 从 CloudflareContext 拿 D1 数据库 binding
 * 用法：const db = getDb()
 */
export function getDb(): D1Database {
  const { env } = getCloudflareContext()
  return env.DB
}

export function getMedia(): R2Bucket {
  const { env } = getCloudflareContext()
  return env.MEDIA
}

export function getCtx(): ExecutionContext {
  return getCloudflareContext().ctx
}
