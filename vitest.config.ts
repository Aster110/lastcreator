import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * v3.6+ 单测配置。
 * 只测纯函数模块（游戏规则、纯工具）；不测 Next.js API routes / React 组件。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
