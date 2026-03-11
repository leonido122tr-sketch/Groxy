'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BackIcon } from '@/app/components/AppIcons'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { PageLoader } from '@/app/components/PageLoader'
import { ForumImageUpload } from '../components/ForumImageUpload'
import { CONTENT_IMAGES_DELIMITER, parseContent, renderForumContent } from '@/lib/forum/renderForumContent'
import { getAvatarDisplayUrl } from '@/lib/avatar/uploadAvatar'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ForumCategory } from '@/lib/forum/types'
import type { ForumTopic } from '@/lib/forum/types'
import type { ForumPost } from '@/lib/forum/types'

type AuthorInfo = { display_name: string | null; email: string | null; avatar: string | null }
/** Столбцы public.profiles в БД — русские имена */
type ProfileRow = { идентификатор: string; отображаемое_имя: string | null; электронная_почта: string | null; аватар: string | null }

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
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [topic, setTopic] = useState<ForumTopic | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [authorsMap, setAuthorsMap] = useState<Record<string, AuthorInfo>>({})
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({})
  const [replyText, setReplyText] = useState('')
  const [replyImageUrls, setReplyImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditingTopic, setIsEditingTopic] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editImageUrls, setEditImageUrls] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    if (!slug || !topicId || !user) {
      setLoading(false)
      return
    }
    let cancelled = false
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
      if (cancelled) return
      const topicData = !topicRes.error && topicRes.data ? (topicRes.data as ForumTopic) : null
      const postsData = postsRes.data ? (postsRes.data as ForumPost[]) : []
      if (topicData) {
        setTopic(topicData)
        supabase.rpc('increment_forum_topic_views', { tid: topicId }).then(() => {})
      }
      setPosts(postsData)
      const userIds = [...new Set([topicData?.user_id, ...postsData.map((p) => p.user_id)].filter(Boolean))] as string[]
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('идентификатор, отображаемое_имя, электронная_почта, аватар')
          .in('идентификатор', userIds)
        const map: Record<string, AuthorInfo> = {}
        const list = (profiles ?? []) as unknown as ProfileRow[]
        for (const p of list) {
          map[p.идентификатор] = {
            display_name: p.отображаемое_имя ?? null,
            email: p.электронная_почта ?? null,
            avatar: p.аватар ?? null,
          }
        }
        setAuthorsMap(map)
        const urls: Record<string, string> = {}
        await Promise.all(
          list.map(async (p: ProfileRow) => {
            const url = await getAvatarDisplayUrl(supabase, p.аватар)
            if (url) urls[p.идентификатор] = url
          })
        )
        if (!cancelled) setAvatarUrls(urls)
      }
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [user, slug, topicId])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !topicId) return
    const text = replyText.trim()
    if (!text) {
      setError('Введите текст комментария.')
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
      setError(insertError.message || 'Не удалось отправить комментарий.')
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

  const startEditTopic = () => {
    if (!topic) return
    const { text, imageUrls } = parseContent(topic.content)
    setEditContent(text)
    setEditImageUrls(imageUrls)
    setIsEditingTopic(true)
    setError(null)
  }

  const cancelEditTopic = () => {
    setIsEditingTopic(false)
    setError(null)
  }

  const handleSaveTopicEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !topic || user.id !== topic.user_id) return
    const text = editContent.trim()
    if (!text) {
      setError('Введите текст темы.')
      return
    }
    setSavingEdit(true)
    setError(null)
    const content = editImageUrls.length
      ? text + CONTENT_IMAGES_DELIMITER + editImageUrls.join('\n')
      : text
    const supabase = createClient()
    const now = new Date().toISOString()
    const { data, error: updateError } = await supabase
      .from('forum_topics')
      .update({ content, updated_at: now, edited_at: now })
      .eq('id', topic.id)
      .eq('user_id', user.id)
      .select()
      .single()
    setSavingEdit(false)
    if (updateError) {
      setError(updateError.message || 'Не удалось сохранить изменения.')
      return
    }
    if (data) setTopic(data as ForumTopic)
    setIsEditingTopic(false)
  }

  if (loading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />

  if (!topic || !category) {
    return (
      <AppPage header={<AppHeader />} width="md" className="py-5">
          <p className="text-zinc-400">Тема не найдена.</p>
          <BackButton fallbackHref={slug ? `/forum/${slug}` : '/forum'} className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-300">
            <BackIcon className="h-4 w-4" />
            К разделу
          </BackButton>
      </AppPage>
    )
  }

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <div>
          <BackButton fallbackHref={`/forum/${slug}`} className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <BackIcon className="h-4 w-4" />
            {category.name}
          </BackButton>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold text-white">{topic.title}</h1>
            {user?.id === topic.user_id && !isEditingTopic && (
              <button
                type="button"
                onClick={startEditTopic}
                className="rounded-xl border border-white/20 bg-[#1a2230] px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-[#243040]"
              >
                Редактировать
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span>{authorsMap[topic.user_id]?.display_name?.trim() || 'Участник'}</span>
            <span>{formatDate(topic.created_at)}</span>
            {topic.edited_at && (
              <span className="text-zinc-500">Изменено {formatDate(topic.edited_at)}</span>
            )}
            <span>{topic.views_count} просмотров</span>
            <span>{topic.replies_count} комментариев</span>
          </div>
        </div>

        {isEditingTopic ? (
          <SurfaceCard className="p-5">
            <form onSubmit={handleSaveTopicEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Текст и фото</label>
                <ForumImageUpload
                  user={user}
                  imageUrls={editImageUrls}
                  onInsertUrl={(url) => setEditImageUrls((prev) => [...prev, url])}
                  onRemoveUrl={(url) => setEditImageUrls((prev) => prev.filter((u) => u !== url))}
                  disabled={savingEdit}
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Текст темы..."
                  rows={6}
                  className="mt-2 min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-2xl bg-[#2f6fed] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {savingEdit ? 'Сохранение…' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditTopic}
                  disabled={savingEdit}
                  className="rounded-2xl border border-white/20 bg-[#1a2230] px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-[#243040] disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="p-5">
            <article>{renderForumContent(topic.content)}</article>
          </SurfaceCard>
        )}

        {posts.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-zinc-400">Комментарии</h2>
            <ul className="flex flex-col gap-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-2xl bg-[#141a22] px-5 py-4">
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    {avatarUrls[p.user_id] ? (
                      <img
                        src={avatarUrls[p.user_id]}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover bg-[#1a2230]"
                      />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded-full bg-[#1a2230] flex items-center justify-center text-[11px] font-medium text-zinc-500">
                        {(authorsMap[p.user_id]?.display_name?.trim() || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-200">{authorsMap[p.user_id]?.display_name?.trim() || 'Участник'}</span>
                      <span className="ml-2">{formatDate(p.created_at)}</span>
                    </div>
                  </div>
                  <div className="mt-2">{renderForumContent(p.content)}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form onSubmit={handleReply} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-400">Комментировать</h2>
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
            placeholder="Ваш комментарий..."
            rows={4}
            className="min-h-[80px] w-full resize-y rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-[#2f6fed] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Отправка…' : 'Отправить'}
          </button>
        </form>

        <BackButton fallbackHref={`/forum/${slug}`} className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          Назад к темам
        </BackButton>
      </div>
    </AppPage>
  )
}
