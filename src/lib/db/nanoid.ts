// 轻量 nanoid：URL-safe 字符集，零依赖，基于 Web Crypto
// 用 62 字符集而非标准 nanoid 的 64 字符集（去掉 -_），因为一些平台对 url 的 _ 处理不稳定

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function nanoid(size = 10): string {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < size; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export type IdPrefix = 'u' | 'p' | 't' | 'm' | 'e'

export function prefixedId(prefix: IdPrefix, size = 10): string {
  return `${prefix}_${nanoid(size)}`
}

export function anonId(): string {
  return nanoid(21) // 更大空间，cookie 专用
}
