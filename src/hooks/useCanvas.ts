'use client'
import { useRef, useEffect, useCallback } from 'react'

interface UseCanvasOptions {
  strokeColor?: string
  lineWidth?: number
}

export function useCanvas({ strokeColor = '#ffffff', lineWidth = 5 }: UseCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const hasDrawn = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [strokeColor, lineWidth])

  const getPos = (e: TouchEvent | MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as MouseEvent).clientX - rect.left,
      y: (e as MouseEvent).clientY - rect.top,
    }
  }

  const startDraw = useCallback((e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    drawing.current = true
    hasDrawn.current = true
    lastPos.current = getPos(e)
  }, [])

  const draw = useCallback((e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }, [])

  const stopDraw = useCallback((e: Event) => {
    e.preventDefault()
    drawing.current = false
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('touchstart', startDraw, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDraw, { passive: false })
    canvas.addEventListener('mousedown', startDraw as EventListener)
    canvas.addEventListener('mousemove', draw as EventListener)
    canvas.addEventListener('mouseup', stopDraw)
    return () => {
      canvas.removeEventListener('touchstart', startDraw)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDraw)
      canvas.removeEventListener('mousedown', startDraw as EventListener)
      canvas.removeEventListener('mousemove', draw as EventListener)
      canvas.removeEventListener('mouseup', stopDraw)
    }
  }, [startDraw, draw, stopDraw])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    hasDrawn.current = false
  }, [])

  const getDataUrl = useCallback(() => {
    const src = canvasRef.current
    if (!src) return ''
    // zzz-studio 不接受透明背景或过小的图，导出时填白底 + 放大到 1024×1024 居中保比例
    const OUT = 1024
    const out = document.createElement('canvas')
    out.width = OUT
    out.height = OUT
    const ctx = out.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUT, OUT)
    const scale = Math.min(OUT / src.width, OUT / src.height)
    const dw = src.width * scale
    const dh = src.height * scale
    ctx.drawImage(src, (OUT - dw) / 2, (OUT - dh) / 2, dw, dh)
    return out.toDataURL('image/png')
  }, [])

  return { canvasRef, clear, getDataUrl, hasDrawn }
}
