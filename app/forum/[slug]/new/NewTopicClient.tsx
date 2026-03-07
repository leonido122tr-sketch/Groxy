'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import { ForumImageUpload } from '@/app/forum/components/ForumImageUpload'
import { CONTENT_IMAGES_DELIMITER } from '@/lib/forum/renderForumContent'
import type { User } from '@supabase/supabase-js'
import type { ForumCategory } from '@/lib/forum/types'

export function NewTopicClient({ slug }: { slug: string }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [title, setTitle] = useState('')
  const [topicText, setTopicText] = useState('')
  const [topicImageUrls, setTopicImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        if (!error && data) setCategory(data as ForumCategory)
      })
  }, [user, slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !category) return
    const t = title.trim()
    const text = topicText.trim()
    if (!t || !text) {
      setError('Заполните тему и текст.')
      return
    }
    if (topicImageUrls.length === 0) {
      setError('Добавьте хотя бы одно фото.')
      return
    }
    setSubmitting(true)
    setError(null)
    const content = text + CONTENT_IMAGES_DELIMITER + topicImageUrls.join('\n')
    const supabase = createClient()
    const { data: topic, error: insertError } = await supabase
      .from('forum_topics')
      .insert({
        category_id: category.id,
        user_id: user.id,
        title: t,
        content,
      })
      .select('id')
      .single()

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message || 'Не удалось создать тему.')
      return
    }
    if (topic?.id) router.push(`/forum/${slug}?topic=${topic.id}`)
  }

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
        <div>
          <h1 className="text-2xl font-bold text-white">Новая тема</h1>
          <p className="mt-0.5 text-sm text-zinc-400">{category.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="topic-title" className="mb-1 block text-sm font-medium text-zinc-300">
              Тема
            </label>
            <input
              id="topic-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Краткое название темы"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="topic-content" className="mb-1 block text-sm font-medium text-zinc-300">
              Текст
            </label>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <ForumImageUpload
                user={user}
                imageUrls={topicImageUrls}
                onInsertUrl={(url) => setTopicImageUrls((prev) => [...prev, url])}
                onRemoveUrl={(url) => setTopicImageUrls((prev) => prev.filter((u) => u !== url))}
                disabled={submitting}
              />
            </div>
            <textarea
              id="topic-content"
              value={topicText}
              onChange={(e) => setTopicText(e.target.value)}
              placeholder="Опишите опыт или задайте вопрос..."
              rows={6}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 resize-y min-h-[120px]"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            >
              {submitting ? 'Создание…' : 'Создать тему'}
            </button>
            <Link
              href={`/forum/${slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Отмена
            </Link>
          </div>
        </form>

        <Link href={`/forum/${slug}`} className="mt-2 text-sm text-white/80 underline hover:text-white">
          Назад к темам
        </Link>
      </main>
    </div>
  )
}
