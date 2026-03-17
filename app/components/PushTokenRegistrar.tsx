'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerPushToken } from '@/lib/push/registerPushToken'

/**
 * На нативной платформе (Capacitor) после входа пользователя регистрирует push-токен
 * и сохраняет его в push_tokens. При монтировании защищённого layout с залогиненным user.
 */
export function PushTokenRegistrar({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    registerPushToken(supabase, userId).then((result) => {
      if (!result.ok && result.reason !== 'not_native' && result.reason !== 'permission_denied') {
        console.warn('[PushTokenRegistrar]', result.reason, result.error)
      }
    })
  }, [userId])

  return null
}
