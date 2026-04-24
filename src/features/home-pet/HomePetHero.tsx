'use client'
import type { PetView } from '@/types/view'

interface Props {
  pet: PetView
}

export default function HomePetHero({ pet }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 anim-fade">
      {/* 宠物大图 */}
      <div className="w-52 h-52 rounded-2xl bg-gray-800 overflow-hidden">
        {pet.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pet.imageUrl}
            alt={pet.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-600">🐾</div>
        )}
      </div>

      {/* 名字 + 徽章 */}
      <div className="flex flex-col items-center gap-1.5">
        <h2 className="text-white text-2xl font-bold tracking-tight">{pet.name}</h2>
        {pet.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {pet.badges.map((b, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 text-[10px]"
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* HP / EXP / 阶段 */}
      <div className="flex items-center gap-6 text-sm tabular-nums">
        <div className="text-center">
          <p className="text-gray-600 text-[10px] tracking-widest uppercase">HP</p>
          <p className="text-white mt-0.5">{pet.hp}</p>
        </div>
        <div className="w-px h-6 bg-gray-800" />
        <div className="text-center">
          <p className="text-gray-600 text-[10px] tracking-widest uppercase">EXP</p>
          <p className="text-white mt-0.5">{pet.exp}</p>
        </div>
        <div className="w-px h-6 bg-gray-800" />
        <div className="text-center">
          <p className="text-gray-600 text-[10px] tracking-widest uppercase">阶段</p>
          <p className="text-gray-300 mt-0.5">{pet.stage}</p>
        </div>
      </div>
    </div>
  )
}
