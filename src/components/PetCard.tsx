'use client'
import Image from 'next/image'
import type { Pet } from '@/types/pet'

interface Props {
  pet: Pet
  onReset: () => void
}

export default function PetCard({ pet, onReset }: Props) {
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col px-6 py-16 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center gap-6">
        {/* 宠物图像 */}
        <div className="w-56 h-56 rounded-2xl bg-gray-800 overflow-hidden flex items-center justify-center">
          {pet.imageUrl ? (
            <Image
              src={pet.imageUrl}
              alt={pet.name}
              width={224}
              height={224}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-gray-600 text-5xl">🐾</span>
          )}
        </div>

        {/* 名字 */}
        <h2 className="text-white text-3xl font-bold">{pet.name}</h2>

        {/* 属性 */}
        <div className="w-full space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>栖息地</span>
            <span className="text-gray-300">{pet.habitat}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>性格</span>
            <span className="text-gray-300">{pet.personality}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>HP</span>
            <span className="text-gray-300">{pet.hp}</span>
          </div>
        </div>

        {/* 技能 */}
        <div className="w-full">
          <p className="text-gray-600 text-xs mb-2">技能</p>
          <div className="flex flex-wrap gap-2">
            {pet.skills.map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 故事 */}
        <p className="text-gray-500 text-xs leading-relaxed text-center">{pet.story}</p>
      </div>

      <button
        onClick={onReset}
        className="mt-8 w-full h-14 rounded-full bg-gray-800 text-gray-400 font-medium active:scale-95 transition-transform"
      >
        再召唤一只
      </button>
    </div>
  )
}
