/**
 * v4.0 §8b 数据层抽象铁律 · 守门测试
 *
 * 规则：SQL 字符串（`.prepare(`）只允许出现在
 *   - src/lib/repo/**
 *   - src/lib/db/**
 *   - src/lib/identity/** · v4.0 grandfathered（TODO: 重构进 src/lib/repo/users.ts）
 *   - src/lib/events/index.ts · v4.0 grandfathered（TODO: 重构进 src/lib/repo/events.ts）
 *
 * 这个测试是 §8b 真正的守门人——ESLint 配置因 Next.js 16 + ESLint 9 兼容问题
 * 暂时无法运行（pre-existing），靠 vitest 跑住底线。
 *
 * 详见：mylife/2-Projects/P101-hackon/19-v3.9-情感闭环与记忆.md §8b
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC_ROOT = join(__dirname, '../../../') // src/

const ALLOWED_PREFIXES = [
  'lib/repo/',
  'lib/db/',
  'lib/identity/', // v4.0 grandfathered
  'lib/events/index.ts', // v4.0 grandfathered（events 子目录的 subscribers/* 不允许）
]

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '__tests__') continue
      walkTs(full, out)
    } else if (
      st.isFile() &&
      (name.endsWith('.ts') || name.endsWith('.tsx')) &&
      !name.endsWith('.d.ts') &&
      !name.endsWith('.test.ts')
    ) {
      out.push(full)
    }
  }
  return out
}

function isAllowed(relPath: string): boolean {
  return ALLOWED_PREFIXES.some(
    p => relPath === p || relPath.startsWith(p),
  )
}

describe('§8b 数据层抽象铁律', () => {
  it('SQL .prepare(...) 只允许在 lib/repo + lib/db + grandfathered 目录', () => {
    const files = walkTs(SRC_ROOT)
    const violations: Array<{ file: string; line: number; snippet: string }> = []

    for (const file of files) {
      const rel = relative(SRC_ROOT, file).replace(/\\/g, '/')
      if (isAllowed(rel)) continue

      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, i) => {
        // 匹配 .prepare( 的实际调用（过滤注释行）
        if (/\.prepare\s*\(/.test(line) && !/^\s*\/\//.test(line.trim())) {
          violations.push({
            file: rel,
            line: i + 1,
            snippet: line.trim().slice(0, 100),
          })
        }
      })
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line}  ${v.snippet}`)
        .join('\n')
      throw new Error(
        `§8b 铁律违规：发现 ${violations.length} 处业务层 SQL，请抽到 lib/repo/*：\n${msg}`,
      )
    }
    expect(violations).toHaveLength(0)
  })
})
