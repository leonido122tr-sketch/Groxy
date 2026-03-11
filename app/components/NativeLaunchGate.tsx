'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { handleOAuthCallbackUrl } from '@/lib/auth/handleOAuthCallback'

/**
 * На нативном приложении при холодном старте по deep link (OAuth callback) сначала
 * проверяем getLaunchUrl() и обрабатываем вход до того, как отрисуется главная страница.
 * Иначе главная страница успевает проверить сессию (её ещё нет) и не редиректит, но после
 * обмена кода мы должны уйти в dashboard, а не остаться на экране входа.
 */
export function NativeLaunchGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [hasCheckedLaunchUrl, setHasCheckedLaunchUrl] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setHasCheckedLaunchUrl(true)
      return
    }
    let cancelled = false
    App.getLaunchUrl()
      .then((result) => {
        if (cancelled) return
        const url = result?.url
        if (url && url.includes('auth/callback') && url.includes('code=')) {
          handleOAuthCallbackUrl(url, router)
          return
        }
        setHasCheckedLaunchUrl(true)
      })
      .catch(() => setHasCheckedLaunchUrl(true))
    return () => { cancelled = true }
  }, [router])

  if (!Capacitor.isNativePlatform()) return <>{children}</>
  if (!hasCheckedLaunchUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Выполняется вход...</p>
      </div>
    )
  }
  return <>{children}</>
}
