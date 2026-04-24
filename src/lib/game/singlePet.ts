/**
 * v3.5: 单宠范式守门。
 *
 * 规则：同一 owner 同时最多 1 只 status='alive' 宠物。
 * 调用者（/api/generate）在召唤前置校验，存活宠则快速失败，避免 zzz / R2 等副作用空跑。
 *
 * DB 层的 UNIQUE INDEX (unq_pets_alive_owner) 是兜底，保证并发安全；
 * 此业务层快速失败是 UX 优化——让错误在工作开始前抛出。
 */
import { countAliveByOwner } from '@/lib/repo/pets'

export class AlreadyAliveError extends Error {
  readonly code = 'ALREADY_ALIVE' as const
  constructor() {
    super('owner already has an alive pet')
    this.name = 'AlreadyAliveError'
  }
}

/**
 * 通过：return void；存活宠：throw AlreadyAliveError。
 * 调用方：
 *   try { await assertCanSummon(userId) } catch (e) {
 *     if (e instanceof AlreadyAliveError) return NextResponse.json(..., { status: 409 })
 *     throw e
 *   }
 */
export async function assertCanSummon(ownerId: string): Promise<void> {
  const n = await countAliveByOwner(ownerId)
  if (n > 0) throw new AlreadyAliveError()
}
