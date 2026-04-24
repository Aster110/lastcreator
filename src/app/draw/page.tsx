'use client'
import { useRouter } from 'next/navigation'
import DrawFlow from '@/features/draw/DrawFlow'

export default function DrawPage() {
  const router = useRouter()
  return <DrawFlow open onClose={() => router.push('/me')} />
}
