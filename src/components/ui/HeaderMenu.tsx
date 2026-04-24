'use client'
import { useState } from 'react'
import Link from 'next/link'

export interface HeaderMenuItem {
  label: string
  icon?: string                // emoji 简单符号
  href?: string                // 优先于 onClick 处理（内部路由）
  onClick?(): void | Promise<void>
  tone?: 'default' | 'danger'
  confirmText?: string         // danger 项的二级 confirm（window.confirm）
}

interface Props {
  items: HeaderMenuItem[]
  /** 按钮 aria-label */
  label?: string
}

/**
 * v3.6: 右上 "⋯" 菜单。
 * 点击展开 fixed inset-0 + 右上 panel；item 点击后自动关闭。
 * danger 项 + confirmText 会弹 window.confirm 再触发。
 */
export default function HeaderMenu({ items, label = '菜单' }: Props) {
  const [open, setOpen] = useState(false)

  const handleItemClick = async (item: HeaderMenuItem, e: React.MouseEvent) => {
    if (item.tone === 'danger' && item.confirmText) {
      if (!window.confirm(item.confirmText)) {
        e.preventDefault()
        return
      }
    }
    if (item.onClick) {
      e.preventDefault()
      setOpen(false)
      await item.onClick()
      return
    }
    // href 分支：由 Link 原生处理，关闭菜单即可
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center text-white text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] active:scale-95 transition-transform"
        aria-label={label}
      >
        ⋯
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 anim-fade"
          onClick={() => setOpen(false)}
        >
          {/* backdrop 透明但点击可关 */}
          <div className="absolute inset-0 bg-black/30" />

          {/* panel 靠右上 */}
          <div
            className="absolute top-12 right-4 min-w-[180px] rounded-2xl bg-gray-900/95 border border-gray-700 shadow-2xl overflow-hidden anim-scale-in"
            onClick={e => e.stopPropagation()}
            style={{ transformOrigin: 'top right' }}
          >
            <ul className="divide-y divide-gray-800">
              {items.map((item, idx) => {
                const body = (
                  <div
                    className={`flex items-center gap-2.5 px-4 py-3 active:bg-gray-800 transition-colors ${
                      item.tone === 'danger' ? 'text-red-300' : 'text-white'
                    }`}
                  >
                    {item.icon && <span className="text-base w-5 text-center">{item.icon}</span>}
                    <span className="text-sm">{item.label}</span>
                  </div>
                )
                if (item.href && !item.onClick) {
                  return (
                    <li key={idx}>
                      <Link
                        href={item.href}
                        onClick={e => handleItemClick(item, e)}
                        className="block"
                      >
                        {body}
                      </Link>
                    </li>
                  )
                }
                return (
                  <li key={idx}>
                    <button
                      onClick={e => handleItemClick(item, e)}
                      className="w-full text-left"
                    >
                      {body}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
