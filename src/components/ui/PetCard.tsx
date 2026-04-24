'use client'
import { useState } from 'react'
import type { DisplayPet } from '@/types/pet'
import ShareActions from './ShareActions'
import Countdown from './Countdown'

interface Props {
  pet: DisplayPet
  /** 再画一只（内部 reset，不离开当前路由） */
  onReset: () => void
  /** 退出召唤流程（一般跳到档案页），没传就不渲染返回按钮 */
  onClose?: () => void
}

export default function PetCard({ pet, onReset, onClose }: Props) {
  const [imgError, setImgError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const handleRetry = () => {
    setImgError(false)
    setRetryKey(k => k + 1)
  }

  const imgSrc = pet.imageUrl
    ? `${pet.imageUrl}${retryKey > 0 ? `?r=${retryKey}` : ''}`
    : null

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col px-6 py-16 overflow-y-auto">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="返回档案"
          className="absolute top-8 left-4 w-10 h-10 flex items-center justify-center text-gray-500 text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
      )}
      <div className="flex-1 flex flex-col items-center gap-6">

        {/* 宠物图像 */}
        <div
          className="w-56 h-56 rounded-2xl bg-gray-800 overflow-hidden flex items-center justify-center anim-scale-in cursor-pointer"
          style={{ animationDelay: '0ms' }}
          onClick={imgError ? handleRetry : undefined}
        >
          {imgSrc && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={retryKey}
              src={imgSrc}
              alt={pet.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : imgError ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <span className="text-3xl">↻</span>
              <span className="text-xs">点击重试</span>
            </div>
          ) : (
            <span className="text-gray-600 text-5xl">🐾</span>
          )}
        </div>

        {/* 名字 */}
        <h2
          className="text-white text-3xl font-bold anim-fade-up anim-glow"
          style={{ animationDelay: '300ms' }}
        >
          {pet.name}
        </h2>

        {/* 初始寿命 */}
        {pet.lifeExpiresAt && (
          <div
            className="flex flex-col items-center gap-1 anim-fade-up"
            style={{ animationDelay: '400ms' }}
          >
            <p className="text-gray-600 text-[10px] tracking-widest uppercase">剩余生命</p>
            <Countdown
              expiresAt={pet.lifeExpiresAt}
              status={pet.status ?? 'alive'}
              variant="hero"
            />
          </div>
        )}

        {/* 属性 */}
        <div
          className="w-full space-y-2 text-sm anim-fade-up"
          style={{ animationDelay: '480ms' }}
        >
          <div className="flex justify-between text-gray-500">
            <span>栖息地</span>
            <span className="text-gray-300">{pet.habitat}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>性格</span>
            <span className="text-gray-300">{pet.personality}</span>
          </div>
        </div>

        {/* 技能 */}
        <div className="w-full">
          <p
            className="text-gray-600 text-xs mb-2 anim-fade"
            style={{ animationDelay: '600ms' }}
          >
            技能
          </p>
          <div className="flex flex-wrap gap-2">
            {pet.skills.map((s, i) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs anim-fade-up"
                style={{ animationDelay: `${650 + i * 120}ms` }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 故事 */}
        <p
          className="text-gray-500 text-xs leading-relaxed text-center anim-fade"
          style={{ animationDelay: `${650 + pet.skills.length * 120 + 100}ms` }}
        >
          {pet.story}
        </p>
      </div>

      {/* 分享 + 再召唤 */}
      <div
        className="mt-8 flex flex-col gap-3 anim-fade"
        style={{ animationDelay: `${650 + pet.skills.length * 120 + 250}ms` }}
      >
        {pet.id && pet.id !== 'local-fallback' && (
          <ShareActions
            petId={pet.id}
            petName={pet.name}
            story={pet.story}
            className="w-full"
          />
        )}
        <button
          onClick={onReset}
          className="w-full h-14 rounded-full bg-white text-gray-900 font-semibold active:scale-95 transition-transform"
        >
          再召唤一只
        </button>
      </div>
    </div>
  )
}
