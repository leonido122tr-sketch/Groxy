'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import type { User } from '@supabase/supabase-js'

export default function KnowledgePage() {
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
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            try { await supabase.auth.signOut() } catch { /* noop */ }
          }
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (timedOut) return
        if (userError) {
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }
        clearTimeout(timeoutId)
        setUser(user)
        setLoading(false)
        if (!user) router.push('/login')
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        if (isSupabaseNetworkError(err)) {
          console.warn('Нет связи с сервером авторизации.')
        } else {
          console.error('Auth check error:', err)
        }
        setLoading(false)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  if (loading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6 sm:px-6 lg:px-8 flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-white">База знаний</h2>
        <p className="mt-0.5 text-sm text-zinc-400">Справочные материалы, инструкции, ответы на частые вопросы</p>

        <div className="mt-2 flex flex-col gap-3">
          <Link
            href="/knowledge/concrete"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Бетон</span>
          </Link>
          <Link
            href="/knowledge/metal"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Металл</span>
          </Link>
          <Link
            href="/knowledge/wood"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Дерево</span>
          </Link>
          <Link
            href="/knowledge/glass"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Стекло</span>
          </Link>
          <Link
            href="/knowledge/insulation"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Материалы для утепления</span>
          </Link>
          <Link
            href="/knowledge/brick"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Кирпич и кладочные материалы</span>
          </Link>
          <Link
            href="/knowledge/roof"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Кровля и гидроизоляция</span>
          </Link>
          <Link
            href="/knowledge/foundation"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Фундаменты</span>
          </Link>
          <Link
            href="/knowledge/finishing"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Отделочные материалы</span>
          </Link>
          <Link
            href="/knowledge/paint"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Лакокрасочные материалы</span>
          </Link>
          <Link
            href="/knowledge/fasteners"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Крепёж и метизы</span>
          </Link>
          <Link
            href="/knowledge/standards"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="text-base font-medium text-white">Нормы и СНиПы</span>
          </Link>
        </div>

        <Link href="/dashboard" className="mt-2 inline-block text-sm text-white/80 underline hover:text-white">
          На главную
        </Link>
      </main>
    </div>
  )
}
