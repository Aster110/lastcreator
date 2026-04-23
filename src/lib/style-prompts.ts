// 画风 prompt 数组——随机选一个，后续直接 push 新风格
export const STYLE_PROMPTS = [
  `Look at this hand-drawn doodle sketch. Keep its overall shape and creature spirit,
   but transform it into a polished kawaii chibi pet character.
   Big sparkling eyes, soft pastel gradient colors, clean outline art, pure white background.
   Make it look alive, expressive, and adorable. The result should feel like a "leveled-up" version of the original doodle.`,
]

export function randomPrompt(): string {
  return STYLE_PROMPTS[Math.floor(Math.random() * STYLE_PROMPTS.length)]
}
