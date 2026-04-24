'use client'
import Link from 'next/link'
import Countdown from './Countdown'
import type { DisplayPet } from '@/types/pet'

interface Props {
  pets: DisplayPet[]
  /** 点击宠物卡跳的 URL 前缀，默认 /me（私人详情）。公开场景传 /p */
  linkPrefix?: string
}

export default function GalleryGrid({ pets, linkPrefix = '/me' }: Props) {
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
          href={`${linkPrefix}/${p.id}`}
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
            {/* 倒计时徽章 */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
              <Countdown
                expiresAt={p.lifeExpiresAt ?? null}
                status={p.status ?? 'alive'}
                variant="inline"
                staticLabel={p.status === 'released' ? '🕊️ 放生' : p.status === 'dead' ? '🕯️ 安息' : ''}
              />
            </div>
          </div>
          <div className="mt-2 px-0.5">
            <p className="text-gray-200 text-sm truncate">{p.name}</p>
            <div className="flex justify-between items-center gap-1">
              <p className="text-gray-600 text-xs truncate">{p.habitat}</p>
              {typeof p.completedTaskCount === 'number' && p.completedTaskCount > 0 && (
                <p className="text-gray-700 text-[10px] tabular-nums shrink-0">✓ {p.completedTaskCount}</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
