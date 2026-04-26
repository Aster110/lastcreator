import { getCtx } from '@/lib/db/client'
import { prefixedId } from '@/lib/db/nanoid'
import { insertEvent } from '@/lib/repo/events'
import type { DomainEvent, EventType } from '@/types/event'

type Handler<T extends EventType> = (e: Extract<DomainEvent, { type: T }>) => void | Promise<void>

const handlers: { [K in EventType]?: Handler<K>[] } = {}

export function on<T extends EventType>(type: T, handler: Handler<T>): void {
  if (!handlers[type]) handlers[type] = []
  ;(handlers[type] as Handler<T>[]).push(handler)
}

/**
 * emit: 同步触发订阅者（不等待，错误 catch），异步写 events 表
 * 订阅者异常不影响主流程
 */
export function emit(event: DomainEvent): void {
  // 1. 同步调用订阅者（但他们的 Promise 扔给 waitUntil）
  const subs = handlers[event.type] ?? []
  for (const h of subs) {
    try {
      const r = (h as Handler<EventType>)(event)
      if (r instanceof Promise) {
        const ctx = safeCtx()
        ctx?.waitUntil(r.catch(err => console.error('[events] subscriber error', event.type, err)))
      }
    } catch (err) {
      console.error('[events] subscriber sync error', event.type, err)
    }
  }

  // 2. 异步持久化到 events 表
  const ctx = safeCtx()
  const persist = persistEvent(event).catch(err => {
    console.error('[events] persist error', event.type, err)
  })
  if (ctx) ctx.waitUntil(persist)
}

async function persistEvent(event: DomainEvent): Promise<void> {
  const { type, at, ...rest } = event
  const actorId =
    'ownerId' in rest ? (rest as { ownerId: string }).ownerId
    : 'petId' in rest ? (rest as { petId: string }).petId
    : null
  await insertEvent({
    id: prefixedId('e'),
    type,
    actorId,
    payload: JSON.stringify(rest),
    createdAt: at,
  })
}

function safeCtx(): ExecutionContext | null {
  try {
    return getCtx()
  } catch {
    return null
  }
}
