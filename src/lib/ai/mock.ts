import type { PetAttributes } from '@/types/pet'
import type { PetGenerator } from './index'

// Demo 兜底素材库：5 只，覆盖不同 habitat 风格
const MOCK_PETS: PetAttributes[] = [
  {
    name: '烈焰球兽',
    habitat: '火域熔炉',
    personality: '暴躁但忠诚',
    skills: ['火焰冲击', '熔岩护盾', '爆裂突进'],
    hp: 387,
    story: '它诞生于世界燃尽后的第一缕火焰',
  },
  {
    name: '幽影爪',
    habitat: '废土裂缝深处',
    personality: '沉默狡黠',
    skills: ['影遁', '暗爪撕裂', '恐惧凝视'],
    hp: 512,
    story: '凡是被它盯上的猎物，从未逃脱',
  },
  {
    name: '铁壳守卫',
    habitat: '末日废土要塞',
    personality: '沉默且坚定',
    skills: ['钢铁意志', '废土重生', '残影冲锋'],
    hp: 731,
    story: '世界崩塌后，它选择守护最后一粒种子',
  },
  {
    name: '霜羽灵',
    habitat: '永冻苔原',
    personality: '冷静疏离',
    skills: ['寒霜低语', '冰棱陷阱', '雪魂呼唤'],
    hp: 295,
    story: '它从零下四十度的风里生出，从未真正开口',
  },
  {
    name: '枯叶精',
    habitat: '森林废墟',
    personality: '温柔警觉',
    skills: ['根须束缚', '枯荣转化', '叶刃乱舞'],
    hp: 466,
    story: '它是世界长出的最后一片绿意',
  },
]

export const mockGenerator: PetGenerator = {
  async generate() {
    return MOCK_PETS[Math.floor(Math.random() * MOCK_PETS.length)]
  },
}
