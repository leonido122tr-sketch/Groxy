'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import { ForumImageUpload } from '@/app/forum/components/ForumImageUpload'
import { CONTENT_IMAGES_DELIMITER, renderForumContent } from '@/lib/forum/renderForumContent'
import type { User } from '@supabase/supabase-js'
import type { ForumCategory } from '@/lib/forum/types'
import type { ForumTopic } from '@/lib/forum/types'
import type { ForumPost } from '@/lib/forum/types'

type AuthorInfo = { display_name: string | null; email: string | null }
/** Столбцы public.profiles в БД — русские имена */
type ProfileRow = { идентификатор: string; отображаемое_имя: string | null; электронная_почта: string | null }

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ForumTopicClient({ slug, topicId }: { slug: string; topicId: string }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [topic, setTopic] = useState<ForumTopic | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [authorsMap, setAuthorsMap] = useState<Record<string, AuthorInfo>>({})
  const [replyText, setReplyText] = useState('')
  const [replyImageUrls, setReplyImageUrls] = useState<string[]>([])
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
    if (!user || !slug || !topicId) return
    const supabase = createClient()
    supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setCategory(data as ForumCategory)
      })

    Promise.all([
      supabase.from('forum_topics').select('*').eq('id', topicId).single(),
      supabase.from('forum_posts').select('*').eq('topic_id', topicId).order('created_at', { ascending: true }),
    ]).then(async ([topicRes, postsRes]) => {
      const topicData = !topicRes.error && topicRes.data ? (topicRes.data as ForumTopic) : null
      const postsData = postsRes.data ? (postsRes.data as ForumPost[]) : []
      if (topicData) {
        setTopic(topicData)
        supabase.rpc('increment_forum_topic_views', { tid: topicId }).then(() => {})
      }
      setPosts(postsData)
      const userIds = [...new Set([topicData?.user_id, ...postsData.map((p) => p.user_id)].filter(Boolean))] as string[]
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
  }, [user, slug, topicId])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !topicId) return
    const text = replyText.trim()
    if (!text) {
      setError('Введите текст ответа.')
      return
    }
    setSubmitting(true)
    setError(null)
    const content = replyImageUrls.length
      ? text + CONTENT_IMAGES_DELIMITER + replyImageUrls.join('\n')
      : text
    const supabase = createClient()
    const { error: insertError } = await supabase.from('forum_posts').insert({
      topic_id: topicId,
      user_id: user.id,
      content,
    })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message || 'Не удалось отправить ответ.')
      return
    }
    setReplyText('')
    setReplyImageUrls([])
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true })
    if (data) setPosts(data as ForumPost[])
    if (topic) setTopic({ ...topic, replies_count: topic.replies_count + 1 })
  }

  if (loading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />

  if (!topic || !category) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
        <AppHeader />
        <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6">
          <p className="text-zinc-400">Тема не найдена.</p>
          <Link href={slug ? `/forum/${slug}` : '/forum'} className="mt-4 inline-block text-sm text-white/80 underline hover:text-white">
            К разделу
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
          <Link href={`/forum/${slug}`} className="text-sm text-white/80 underline hover:text-white">
            ← {category.name}
          </Link>
          <h1 className="mt-2 text-xl font-bold text-white">{topic.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
            <span>{authorsMap[topic.user_id]?.display_name?.trim() || 'Участник'}</span>
            <span>{formatDate(topic.created_at)}</span>
            <span>{topic.views_count} просмотров</span>
            <span>{topic.replies_count} ответов</span>
          </div>
        </div>

        <article className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          {renderForumContent(topic.content)}
        </article>

        {posts.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-zinc-400">Ответы</h2>
            <ul className="flex flex-col gap-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{authorsMap[p.user_id]?.display_name?.trim() || 'Участник'}</span>
                    <span>{formatDate(p.created_at)}</span>
                  </div>
                  <div className="mt-2">{renderForumContent(p.content)}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form onSubmit={handleReply} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-400">Ответить</h2>
          <div className="flex flex-wrap items-center gap-2">
            <ForumImageUpload
              user={user}
              imageUrls={replyImageUrls}
              onInsertUrl={(url) => setReplyImageUrls((prev) => [...prev, url])}
              onRemoveUrl={(url) => setReplyImageUrls((prev) => prev.filter((u) => u !== url))}
              disabled={submitting}
            />
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Ваш ответ..."
            rows={4}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 resize-y min-h-[80px]"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
          >
            {submitting ? 'Отправка…' : 'Отправить'}
          </button>
        </form>

        <Link href={`/forum/${slug}`} className="mt-2 text-sm text-white/80 underline hover:text-white">
          Назад к темам
        </Link>
      </main>
    </div>
  )
}
