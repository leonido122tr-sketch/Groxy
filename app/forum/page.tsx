'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import type { User } from '@supabase/supabase-js'
import type { ForumCategory } from '@/lib/forum/types'

export default function ForumPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({})
  const [loadError, setLoadError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setLoadError('Не удалось загрузить разделы. Выполните настройку форума в Supabase.')
          return
        }
        setCategories((data ?? []) as ForumCategory[])
      })

    supabase
      .from('forum_topics')
      .select('category_id')
      .then(({ data }) => {
        if (!data) return
        const counts: Record<string, number> = {}
        data.forEach((r) => {
          counts[r.category_id] = (counts[r.category_id] ?? 0) + 1
        })
        setTopicCounts(counts)
      })
  }, [user])

  if (loading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6 sm:px-6 lg:px-8 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Форум</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Разделы по типам построек и конструкций</p>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {loadError} В Supabase → SQL Editor выполните скрипт из файла <strong>docs/forum_schema.sql</strong>.
          </div>
        )}

        <nav className="flex flex-col gap-2">
          {categories.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-center text-sm text-zinc-400">
              {loadError ? (
                'Разделы не загружены.'
              ) : (
                <>
                  <p>Загрузка разделов…</p>
                  <p className="mt-2 text-xs">Если разделы не появились — выполните в Supabase (SQL Editor) скрипт <strong>docs/forum_schema.sql</strong></p>
                </>
              )}
            </div>
          )}
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/forum/${cat.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
            >
              <span className="text-base font-medium text-white">{cat.name}</span>
              <span className="text-sm text-zinc-400">
                {topicCounts[cat.id] ?? 0} тем
              </span>
            </Link>
          ))}
        </nav>

        <Link href="/community" className="mt-2 text-sm text-white/80 underline hover:text-white">
          Назад в сообщество
        </Link>
      </main>
    </div>
  )
}
