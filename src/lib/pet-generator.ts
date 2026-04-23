import type { Pet } from '@/types/pet'

// 变化区接口：后面换成 OpenRouter AI 只改这里
export type PetGeneratorFn = (imageUrl: string) => Promise<Omit<Pet, 'id' | 'imageUrl'>>

const MOCK_PETS: Omit<Pet, 'id' | 'imageUrl'>[] = [
  {
    name: '烈焰球兽',
    habitat: '火域深渊',
    personality: '暴躁但忠诚',
    skills: ['火焰冲击', '熔岩护盾', '爆裂突进'],
    hp: 100,
    story: '它诞生于世界燃尽后的第一缕火焰，守护着最后的幸存者。',
  },
  {
    name: '幽影爪',
    habitat: '废土裂缝',
    personality: '沉默狡黠',
    skills: ['影遁', '暗爪撕裂', '恐惧凝视'],
    hp: 85,
    story: '没有人知道它从哪里来，只知道凡是被它盯上的猎物，从未逃脱。',
  },
  {
    name: '风尘浪子',
    habitat: '荒漠废墟',
    personality: '洒脱不羁',
    skills: ['疾风步', '沙尘暴', '流浪者之歌'],
    hp: 90,
    story: '末日后它独自穿越了七片荒漠，只为寻找传说中还有生命的绿洲。',
  },
]

// V1: mock 实现——TODO 接 OpenRouter AI
export const generatePetInfo: PetGeneratorFn = async (_imageUrl: string) => {
  return MOCK_PETS[Math.floor(Math.random() * MOCK_PETS.length)]
}
