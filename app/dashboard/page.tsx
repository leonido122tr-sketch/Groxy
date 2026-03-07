'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6 sm:px-6 lg:px-8 flex flex-col justify-start gap-3">
        <Link
          href="/projects/create"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors group-hover:bg-white/10">
            <svg className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <span className="text-base font-medium text-white">Создать новый проект</span>
        </Link>

        <Link
          href="/project"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors group-hover:bg-white/10">
            <svg className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </span>
          <span className="text-base font-medium text-white">Мои проекты</span>
        </Link>

        <Link
          href="/materials/compare"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors group-hover:bg-white/10">
            <svg className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </span>
          <span className="text-base font-medium text-white">Сравнение материалов</span>
        </Link>

        <Link
          href="/community"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors group-hover:bg-white/10">
            <svg className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <span className="text-base font-medium text-white">Сообщество</span>
        </Link>

        <Link
          href="/knowledge"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors group-hover:bg-white/10">
            <svg className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <span className="text-base font-medium text-white">База знаний</span>
        </Link>
      </main>
    </div>
  )
}
