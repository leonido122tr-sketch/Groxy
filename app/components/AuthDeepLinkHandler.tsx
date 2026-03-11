'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { handleOAuthCallbackUrl } from '@/lib/auth/handleOAuthCallback'

/**
 * В нативном приложении: при открытии по ссылке (appUrlOpen) — когда приложение уже запущено
 * и пользователь возвращается из браузера по com.groxy.app://auth/callback?code=...
 * Холодный старт с callback обрабатывается в NativeLaunchGate.
 */
export function AuthDeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listener = App.addListener('appUrlOpen', (e) => {
      handleOAuthCallbackUrl(e.url, router)
    })

    return () => {
      listener.then((l) => l.remove())
    }
  }, [router])

  return null
}
