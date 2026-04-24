'use client'
import { useRef, useState } from 'react'

interface Props {
  onSubmit: (dataUrl: string) => void
  onCancel: () => void
}

/**
 * 拍照 proof：input[type=file accept=image/*] 拉起系统相机/相册，压缩到 1024px PNG
 */
export default function PhotoProof({ onSubmit, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file, 1024)
    setPreview(dataUrl)
  }

  const trigger = () => inputRef.current?.click()

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col px-5 py-10">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center text-gray-500 text-xl">
          ←
        </button>
        <p className="text-gray-500 text-sm">拍照 / 选图</p>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex items-center justify-center mt-6">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="max-w-full max-h-full rounded-2xl object-contain" />
        ) : (
          <button
            onClick={trigger}
            className="w-full max-w-xs aspect-square rounded-2xl border-2 border-dashed border-gray-700 text-gray-500 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <span className="text-5xl">📷</span>
            <span className="text-sm">点击拍照或选图</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <div className="flex gap-3 mt-6 shrink-0">
        {preview && (
          <button
            onClick={trigger}
            className="flex-1 h-12 rounded-full bg-gray-800 text-gray-300 active:scale-95 transition-transform"
          >
            重拍
          </button>
        )}
        <button
          disabled={!preview}
          onClick={() => preview && onSubmit(preview)}
          className="flex-1 h-12 rounded-full bg-white text-gray-900 font-semibold disabled:opacity-40 disabled:active:scale-100 active:scale-95 transition-transform"
        >
          提交
        </button>
      </div>
    </div>
  )
}

async function compressImage(file: File, maxSide: number): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, w, h)
  return canvas.toDataURL('image/png')
}
