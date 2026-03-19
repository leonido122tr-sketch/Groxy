'use client'

import { useEffect } from 'react'

/**
 * Обрабатывает необработанные отклонения «Failed to fetch» из Supabase Auth
 * (_useSession / _getUser при отсутствии сети или недоступности API),
 * чтобы не засорять консоль красным TypeError.
 */
export function SupabaseNetworkErrorHandler() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const msg = reason?.message ?? String(reason)
      const isAuthRetryable = reason && (reason.name === 'AuthRetryableFetchError' || (reason as Error).constructor?.name === 'AuthRetryableFetchError')
      const isFetchError = msg === 'Failed to fetch' || msg === 'SupabaseNetworkError' || (typeof msg === 'string' && msg.toLowerCase().includes('fetch'))
      const isTypeErrorFetch = reason instanceof TypeError && msg === 'Failed to fetch'
      if (isFetchError || isTypeErrorFetch || isAuthRetryable) {
        event.preventDefault()
        event.stopImmediatePropagation?.()
        console.warn('Сеть недоступна (Supabase Auth). Проверьте интернет или настройки Supabase.')
      }
    }
    window.addEventListener('unhandledrejection', handler, true)
    return () => window.removeEventListener('unhandledrejection', handler, true)
  }, [])
  return null
}
