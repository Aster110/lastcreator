import type { ElementId } from '@/types/pet'

export type { ElementId }

export interface StyleVariant {
  id: ElementId
  name: string
  weight: number
  prompt: string
}

// weight 之和 = 100
export const STYLE_PROMPTS: StyleVariant[] = [
  {
    id: 'ruins',
    name: '废墟',
    weight: 18,
    prompt:
      '识别手绘图的大体形状，根据轮廓生成一只饥荒风格、暗黑哥特风Q萌丑萌的宠物，注意保持手绘基本轮廓可以美化完善部分图样，可以分配废墟属性给用户并且给相应的属性对应配色（废墟以土黄色为主色需要在宠物的皮肤上加上裂缝）（配色低饱和为主），背景换成纯白色背景',
  },
  {
    id: 'fire',
    name: '火',
    weight: 18,
    prompt:
      '识别手绘图的大体形状，根据轮廓生成一只饥荒风格、暗黑哥特风Q萌丑萌的宠物，注意保持手绘基本轮廓可以美化完善部分图样，可以分配火属性给用户并且给相应的属性对应配色（火属性以橙红黑色为主色，身体的部分地方可以变成內部熔岩结构体现属性特征）（配色低饱和为主），背景换成纯白色背景',
  },
  {
    id: 'water',
    name: '水',
    weight: 18,
    prompt:
      '识别手绘图的大体形状，根据轮廓生成一只饥荒风格、暗黑哥特风Q萌丑萌的宠物，注意保持手绘基本轮廓可以美化完善部分图样，可以分配水属性给用户并且给相应的属性对应配色（水以水蓝色色为主色，身体的部分地方可以变成流水结构或者半凝胶化体现属性特征）（配色低饱和为主），背景换成纯白色背景',
  },
  {
    id: 'dark',
    name: '暗黑',
    weight: 18,
    prompt:
      '识别手绘图的大体形状，根据轮廓生成一只饥荒风格、暗黑哥特风Q萌丑萌的宠物，注意保持手绘基本轮廓可以美化完善部分图样，可以分配暗黑属性给用户并且给相应的属性对应配色（暗黑以暗紫色为主色，以梦境作为最大的主题参考，身体的部分地方可以变成星空结构或者黑影化体现属性特征）（配色低饱和为主），背景换成纯白色背景',
  },
  {
    id: 'ice',
    name: '冰',
    weight: 18,
    prompt:
      '识别手绘图的大体形状，根据轮廓生成一只饥荒风格、暗黑哥特风Q萌丑萌的宠物，注意保持手绘基本轮廓可以美化完善部分图样，可以分配冰属性给用户并且给相应的属性对应配色（冰以冰蓝色为主色，身体的部分地方可以变成冰晶结构或者镜面化体现属性特征）（配色低饱和为主），背景换成纯白色背景',
  },
  {
    id: 'sky',
    name: '天空',
    weight: 10,
    prompt:
      '识别手绘图的大体形状，根据轮廓生成一只饥荒风格、暗黑哥特风Q萌丑萌的宠物，注意保持手绘基本轮廓可以美化完善部分图样，可以分配天空属性给用户并且给相应的属性对应配色（天空以蓝粉色为主，身体的部分地方可以变成绵软的云朵结构或者风化透明化体现属性特征）（配色低饱和为主），背景换成纯白色背景',
  },
]

export function pickStyle(): StyleVariant {
  const total = STYLE_PROMPTS.reduce((s, v) => s + v.weight, 0)
  let r = Math.random() * total
  for (const v of STYLE_PROMPTS) {
    r -= v.weight
    if (r < 0) return v
  }
  return STYLE_PROMPTS[STYLE_PROMPTS.length - 1]
}

export function randomPrompt(): string {
  return pickStyle().prompt
}
