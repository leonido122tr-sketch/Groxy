'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import { getImageUrlsFromContent } from '@/lib/forum/renderForumContent'
import type { User } from '@supabase/supabase-js'
import type { ForumCategory } from '@/lib/forum/types'
import type { ForumTopicWithAuthor } from '@/lib/forum/types'

type AuthorInfo = { display_name: string | null; email: string | null }

/** Столбцы public.profiles в БД — русские имена */
type ProfileRow = {
  идентификатор: string
  отображаемое_имя: string | null
  электронная_почта: string | null
}

export function ForumCategoryClient({ slug }: { slug: string }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [topics, setTopics] = useState<ForumTopicWithAuthor[]>([])
  const [authorsMap, setAuthorsMap] = useState<Record<string, AuthorInfo>>({})

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
    if (!user || !slug) return
    const supabase = createClient()
    supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setCategory(null)
          return
        }
        setCategory(data as ForumCategory)
        return (data as ForumCategory).id
      })
      .then((categoryId) => {
        if (!categoryId) return
        return supabase
          .from('forum_topics')
          .select('*')
          .eq('category_id', categoryId)
          .order('pinned', { ascending: false })
          .order('updated_at', { ascending: false })
      })
      .then(async (res) => {
        if (!res?.data) return
        const list = res.data as ForumTopicWithAuthor[]
        setTopics(list)
        const userIds = [...new Set(list.map((t) => t.user_id).filter(Boolean))]
        if (userIds.length === 0) return
        const { data: profiles } = await supabase
          .from('profiles')
          .select('идентификатор, отображаемое_имя, электронная_почта')
          .in('идентификатор', userIds)
        const map: Record<string, AuthorInfo> = {}
        for (const p of (profiles ?? []) as ProfileRow[]) {
          map[p.идентификатор] = {
            display_name: p.отображаемое_имя ?? null,
            email: p.электронная_почта ?? null,
          }
        }
        setAuthorsMap(map)
      })
  }, [user, slug])

  if (loading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />

  if (!category) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
        <AppHeader />
        <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6">
          <p className="text-zinc-400">Раздел не найден.</p>
          <Link href="/forum" className="mt-4 inline-block text-sm text-white/80 underline hover:text-white">
            К форуму
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6 sm:px-6 lg:px-8 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{category.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-400">{topics.length} тем</p>
          </div>
          <Link
            href={`/forum/${slug}/new`}
            className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Новая тема
          </Link>
        </div>

        <ul className="flex flex-col gap-2">
          {topics.length === 0 ? (
            <li className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-center text-sm text-zinc-400">
              Пока нет тем. Создайте первую.
            </li>
          ) : (
            topics.map((t) => {
              const firstImage = getImageUrlsFromContent(t.content)[0]
              return (
                <li key={t.id}>
                  <Link
                    href={`/forum/${slug}?topic=${t.id}`}
                    className="block overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-200 hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
                  >
                    <div className="px-5 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-white">{t.title}</span>
                        {t.pinned && (
                          <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                            Закреплено
                          </span>
                        )}
                      </div>
                    </div>
                    {firstImage && (
                      <div className="mt-3 w-full aspect-[4/3] overflow-hidden bg-white/5">
                        <img
                          src={firstImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="px-5 py-4">
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>{t.replies_count} ответов</span>
                        <span>{t.views_count} просмотров</span>
                        <span>
                          {new Date(t.updated_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="mt-2 border-t border-white/5 pt-2 text-xs text-zinc-500">
                        Автор: {authorsMap[t.user_id]?.display_name?.trim() || 'Участник'}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })
          )}
        </ul>

        <Link href="/forum" className="mt-2 text-sm text-white/80 underline hover:text-white">
          Назад к разделам
        </Link>
      </main>
    </div>
  )
}
