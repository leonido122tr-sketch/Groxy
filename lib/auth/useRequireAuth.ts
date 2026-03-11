'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { AUTH_CHECK_TIMEOUT_MS } from '@/lib/auth/constants'
import type { User } from '@supabase/supabase-js'

export type UseRequireAuthResult = {
  user: User | null
  loading: boolean
}

/**
 * Хук проверки авторизации для защищённых страниц.
 * При отсутствии сессии/пользователя или ошибке выполняет редирект на /login.
 * Обрабатывает Refresh Token ошибки (signOut + редирект).
 */
export function useRequireAuth(): UseRequireAuthResult {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      setLoading(false)
      router.push('/login')
    }, AUTH_CHECK_TIMEOUT_MS)

    const checkAuth = async () => {
      try {
        const supabase = createClient()

        const { error: sessionError } = await supabase.auth.getSession()
        if (timedOut) return

        if (sessionError) {
          console.error('Session error:', sessionError)
          if (
            sessionError.message?.includes('Refresh Token') ||
            sessionError.message?.includes('Invalid Refresh Token')
          ) {
            try {
              await supabase.auth.signOut()
            } catch (signOutError) {
              console.error('Ошибка при выходе:', signOutError)
            }
          }
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()
        if (timedOut) return

        if (userError) {
          console.error('User error:', userError)
          if (
            userError.message?.includes('Refresh Token') ||
            userError.message?.includes('Invalid Refresh Token')
          ) {
            try {
              await supabase.auth.signOut()
            } catch (signOutError) {
              console.error('Ошибка при выходе:', signOutError)
            }
          }
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }

        clearTimeout(timeoutId)
        setUser(currentUser ?? null)
        setLoading(false)

        if (!currentUser) {
          router.push('/login')
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        const message = err instanceof Error ? err.message : String(err)
        if (isSupabaseNetworkError(err)) {
          console.warn('Нет связи с сервером авторизации.')
        } else if (
          message.includes('Refresh Token') ||
          message.includes('Invalid Refresh Token')
        ) {
          try {
            const supabase = createClient()
            await supabase.auth.signOut()
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError)
          }
        } else {
          console.error('Auth check error:', err)
        }
        setLoading(false)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  return { user, loading }
}
