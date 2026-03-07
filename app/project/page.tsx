'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { LocalProjectsList } from '@/app/components/LocalProjectsList'
import { PageLoader } from '@/app/components/PageLoader'
import { clearResultOverridesFromStorage } from '@/lib/projects/resultOverridesStorage'
import type { User } from '@supabase/supabase-js'

export default function MyProjectsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clearResultOverridesFromStorage()
  }, [])

  useEffect(() => {
    const AUTH_CHECK_TIMEOUT_MS = 8000
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
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
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

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (timedOut) return

        if (userError) {
          console.error('User error:', userError)
          if (userError.message?.includes('Refresh Token') || userError.message?.includes('Invalid Refresh Token')) {
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
        setUser(user)
        setLoading(false)

        if (!user) {
          router.push('/login')
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        const message = err instanceof Error ? err.message : String(err)
        if (isSupabaseNetworkError(err)) {
          console.warn('Нет связи с сервером авторизации.')
        } else if (message.includes('Refresh Token') || message.includes('Invalid Refresh Token')) {
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

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <PageLoader message="Перенаправление..." />
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Мои проекты</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Создавайте, сохраняйте и делитесь своими проектами
          </p>
        </div>

        <LocalProjectsList />
      </main>
    </div>
  )
}
