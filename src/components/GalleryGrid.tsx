'use client'
import Link from 'next/link'
import type { DisplayPet } from '@/types/pet'

interface Props {
  pets: DisplayPet[]
}

export default function GalleryGrid({ pets }: Props) {
  if (pets.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 text-sm">还没有召唤过任何生命</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {pets.map(p => (
        <Link
          key={p.id}
          href={`/p/${p.id}`}
          className="group"
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-900 border border-gray-800 relative">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.imageUrl}
                alt={p.name}
                className="w-full h-full object-cover transition-transform group-active:scale-95"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-700">
                🐾
              </div>
            )}
            {p.stage && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-gray-300 text-xs backdrop-blur-sm">
                {p.stage}
              </span>
            )}
          </div>
          <div className="mt-2 px-0.5">
            <p className="text-gray-200 text-sm truncate">{p.name}</p>
            <p className="text-gray-600 text-xs truncate">{p.habitat}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
