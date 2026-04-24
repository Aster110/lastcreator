import type { Task, TaskProof, TaskVerdict } from '@/types/task'

export interface TaskVerifier {
  verify(task: Task, proof: TaskProof): Promise<TaskVerdict>
}

/**
 * v3 MVP 实现：永远 pass。接缝留给 v4 接真 Claude Vision。
 */
export const alwaysPassVerifier: TaskVerifier = {
  async verify(task, proof) {
    return {
      pass: true,
      confidence: 1,
      reason: `MVP 模式：任务 "${task.prompt}" 已接受你的${proof.kind === 'photo' ? '照片' : '涂鸦'}`,
    }
  },
}

// v4 实现（占位，未接入）：
//
// export const claudeVisionVerifier: TaskVerifier = {
//   async verify(task, proof) {
//     const apiKey = process.env.OPENROUTER_API_KEY
//     const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         model: 'anthropic/claude-sonnet-4-6',
//         messages: [{
//           role: 'user',
//           content: [
//             { type: 'image_url', image_url: { url: proof.imageUrl } },
//             { type: 'text', text: `任务：${task.prompt}\n验证标准：${task.verifyHint}\n只输出 JSON: { "pass": true|false, "reason": "..." }` },
//           ],
//         }],
//       }),
//     })
//     // ... parse & return
//   },
// }
