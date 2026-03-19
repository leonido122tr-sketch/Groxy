'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Eye, Heart, MessageCircle, Smile, Paperclip, Send } from 'lucide-react'
import { BackIcon } from '@/app/components/AppIcons'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { PageLoader } from '@/app/components/PageLoader'
import { CONTENT_IMAGES_DELIMITER, parseContent, renderForumContent } from '@/lib/forum/renderForumContent'
import { FORUM_EMOJI_USAGE_KEY, FORUM_EMOJIS } from '@/lib/forum/forumEmoji'
import { getAvatarDisplayUrl } from '@/lib/avatar/uploadAvatar'
import { uploadForumImage } from '@/lib/forum/uploadForumImage'
import { ForumImagePreviewGrid } from '@/app/(protected)/forum/components/ForumImagePreviewGrid'
import { ForumImageUpload } from '@/app/(protected)/forum/components/ForumImageUpload'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ForumCategory } from '@/lib/forum/types'
import type { ForumTopic } from '@/lib/forum/types'
import type { ForumPost } from '@/lib/forum/types'
import type { ForumTopicSupplement } from '@/lib/forum/types'

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

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString('ru-RU', {
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
  const [supplements, setSupplements] = useState<ForumTopicSupplement[]>([])
  const [isAddingSupplement, setIsAddingSupplement] = useState(false)
  const [supplementContent, setSupplementContent] = useState('')
  const [supplementImageUrls, setSupplementImageUrls] = useState<string[]>([])
  const [savingSupplement, setSavingSupplement] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [emojiUsage, setEmojiUsage] = useState<Record<string, number>>({})
  const [topicLikesCount, setTopicLikesCount] = useState(0)
  const [topicLikedByMe, setTopicLikedByMe] = useState(false)
  const [postLikesCount, setPostLikesCount] = useState<Record<string, number>>({})
  const [postLikedByMe, setPostLikedByMe] = useState<Record<string, boolean>>({})
  const replyFileInputRef = useRef<HTMLInputElement>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

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
      supabase.from('forum_topic_supplements').select('*').eq('topic_id', topicId).order('created_at', { ascending: true }),
    ]).then(async ([topicRes, postsRes, supplementsRes]) => {
      if (cancelled) return
      const topicData = !topicRes.error && topicRes.data ? (topicRes.data as ForumTopic) : null
      const postsData = postsRes.data ? (postsRes.data as ForumPost[]) : []
      const supplementsData = supplementsRes.data ? (supplementsRes.data as ForumTopicSupplement[]) : []
      if (!cancelled) setSupplements(supplementsData)
      if (topicData) {
        setTopic({ ...topicData, replies_count: postsData.length })
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
      if (topicId && !cancelled) {
        Promise.all([
          supabase.from('forum_topic_likes').select('user_id').eq('topic_id', topicId),
          postsData.length > 0
            ? supabase.from('forum_post_likes').select('post_id, user_id').in('post_id', postsData.map((p) => p.id))
            : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
        ]).then(([topicLikesRes, postLikesRes]) => {
          if (cancelled) return
          const topicRows = (topicLikesRes.data ?? []) as { user_id: string }[]
          setTopicLikesCount(topicRows.length)
          setTopicLikedByMe(user ? topicRows.some((r) => r.user_id === user.id) : false)
          const postRows = (postLikesRes.data ?? []) as { post_id: string; user_id: string }[]
          const byPost: Record<string, number> = {}
          const likedByMe: Record<string, boolean> = {}
          postsData.forEach((p) => {
            byPost[p.id] = 0
            likedByMe[p.id] = false
          })
          postRows.forEach((r) => {
            byPost[r.post_id] = (byPost[r.post_id] ?? 0) + 1
            if (user && r.user_id === user.id) likedByMe[r.post_id] = true
          })
          setPostLikesCount(byPost)
          setPostLikedByMe(likedByMe)
        })
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
    if (replyTextareaRef.current) {
      replyTextareaRef.current.style.height = 'auto'
    }
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true })
    if (data) {
      const newPosts = data as ForumPost[]
      setPosts(newPosts)
      setPostLikesCount((prev) => {
        const next = { ...prev }
        newPosts.forEach((p) => {
          if (next[p.id] === undefined) next[p.id] = 0
        })
        return next
      })
      setPostLikedByMe((prev) => {
        const next = { ...prev }
        newPosts.forEach((p) => {
          if (next[p.id] === undefined) next[p.id] = false
        })
        return next
      })
      const newPostUserIds = [...new Set(newPosts.map((p) => p.user_id).filter(Boolean))] as string[]
      const missingIds = newPostUserIds.filter((id) => !avatarUrls[id])
      if (missingIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('идентификатор, отображаемое_имя, электронная_почта, аватар')
          .in('идентификатор', missingIds)
        const list = (profiles ?? []) as unknown as ProfileRow[]
        const newMap: Record<string, AuthorInfo> = {}
        const newUrls: Record<string, string> = {}
        for (const p of list) {
          newMap[p.идентификатор] = {
            display_name: p.отображаемое_имя ?? null,
            email: p.электронная_почта ?? null,
            avatar: p.аватар ?? null,
          }
          const url = await getAvatarDisplayUrl(supabase, p.аватар)
          if (url) newUrls[p.идентификатор] = url
        }
        setAuthorsMap((prev) => ({ ...prev, ...newMap }))
        setAvatarUrls((prev) => ({ ...prev, ...newUrls }))
      }
    }
    if (topic) setTopic({ ...topic, replies_count: topic.replies_count + 1 })
  }

  const toggleTopicLike = useCallback(async () => {
    if (!user || !topicId) return
    const supabase = createClient()
    if (topicLikedByMe) {
      await supabase.from('forum_topic_likes').delete().eq('topic_id', topicId).eq('user_id', user.id)
      setTopicLikesCount((c) => Math.max(0, c - 1))
      setTopicLikedByMe(false)
    } else {
      await supabase.from('forum_topic_likes').insert({ topic_id: topicId, user_id: user.id })
      setTopicLikesCount((c) => c + 1)
      setTopicLikedByMe(true)
    }
  }, [user, topicId, topicLikedByMe])

  const togglePostLike = useCallback(async (postId: string) => {
    if (!user) return
    const supabase = createClient()
    const liked = postLikedByMe[postId]
    if (liked) {
      await supabase.from('forum_post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      setPostLikesCount((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 0) - 1) }))
      setPostLikedByMe((prev) => ({ ...prev, [postId]: false }))
    } else {
      await supabase.from('forum_post_likes').insert({ post_id: postId, user_id: user.id })
      setPostLikesCount((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }))
      setPostLikedByMe((prev) => ({ ...prev, [postId]: true }))
    }
  }, [user, postLikedByMe])

  const startAddSupplement = () => {
    setSupplementContent('')
    setSupplementImageUrls([])
    setIsAddingSupplement(true)
    setError(null)
  }

  const cancelAddSupplement = () => {
    setIsAddingSupplement(false)
    setError(null)
  }

  const hasReplyContent = replyText.trim().length > 0 || replyImageUrls.length > 0

  const onReplyAttach = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !user) return
      e.target.value = ''
      if (replyImageUrls.length >= 5) return
      setError(null)
      setAttaching(true)
      try {
        const supabase = createClient()
        const url = await uploadForumImage(supabase, file, user.id)
        setReplyImageUrls((prev) => (prev.length >= 5 ? prev : [...prev, url]))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить фото.')
      } finally {
        setAttaching(false)
      }
    },
    [user, replyImageUrls.length]
  )

  const adjustReplyTextareaHeight = useCallback(() => {
    const ta = replyTextareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [])

  const insertEmoji = useCallback(
    (emoji: string) => {
      const ta = replyTextareaRef.current
      if (!ta) {
        setReplyText((prev) => prev + emoji)
      } else {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const before = replyText.slice(0, start)
        const after = replyText.slice(end)
        const next = before + emoji + after
        setReplyText(next)
        requestAnimationFrame(() => {
          ta.focus()
          const newPos = start + emoji.length
          ta.setSelectionRange(newPos, newPos)
          adjustReplyTextareaHeight()
        })
      }
      setEmojiPickerOpen(false)
      try {
        const raw = localStorage.getItem(FORUM_EMOJI_USAGE_KEY)
        const usage: Record<string, number> = raw ? JSON.parse(raw) : {}
        usage[emoji] = (usage[emoji] ?? 0) + 1
        localStorage.setItem(FORUM_EMOJI_USAGE_KEY, JSON.stringify(usage))
        setEmojiUsage(usage)
      } catch {
        // ignore
      }
    },
    [replyText, adjustReplyTextareaHeight]
  )

  useEffect(() => {
    if (!emojiPickerOpen) return
    try {
      const raw = localStorage.getItem(FORUM_EMOJI_USAGE_KEY)
      setEmojiUsage(raw ? JSON.parse(raw) : {})
    } catch {
      setEmojiUsage({})
    }
  }, [emojiPickerOpen])

  useEffect(() => {
    if (!emojiPickerOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [emojiPickerOpen])

  useEffect(() => {
    if (typeof window === 'undefined' || !topic || loading) return
    if (window.location.hash !== '#comments') return
    const t = setTimeout(() => {
      document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(t)
  }, [topic, loading])

  const sortedReplyEmojis = useMemo(
    () => [...FORUM_EMOJIS].sort((a, b) => (emojiUsage[b] ?? 0) - (emojiUsage[a] ?? 0)),
    [emojiUsage]
  )

  const handleSaveSupplement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !topic || user.id !== topic.user_id) return
    const text = supplementContent.trim()
    if (!text) {
      setError('Введите текст дополнения.')
      return
    }
    setSavingSupplement(true)
    setError(null)
    const content = supplementImageUrls.length
      ? text + CONTENT_IMAGES_DELIMITER + supplementImageUrls.join('\n')
      : text
    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from('forum_topic_supplements')
      .insert({ topic_id: topic.id, user_id: user.id, content })
      .select()
      .single()
    setSavingSupplement(false)
    if (insertError) {
      setError(insertError.message || 'Не удалось сохранить дополнение.')
      return
    }
    if (data) setSupplements((prev) => [...prev, data as ForumTopicSupplement])
    setIsAddingSupplement(false)
    setSupplementContent('')
    setSupplementImageUrls([])
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
            {user?.id === topic.user_id && !isAddingSupplement && (
              <button
                type="button"
                onClick={startAddSupplement}
                className="rounded-xl border border-white/20 bg-[#1a2230] px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-[#243040]"
              >
                Дополнить
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            {avatarUrls[topic.user_id] ? (
              <img
                src={avatarUrls[topic.user_id]}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover bg-[#1a2230]"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a2230] text-[11px] font-medium text-zinc-500">
                {(authorsMap[topic.user_id]?.display_name?.trim() || '?')[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-zinc-200">
              {authorsMap[topic.user_id]?.display_name?.trim() || 'Участник'}
            </span>
          </div>
        </div>

        {isAddingSupplement ? (
          <SurfaceCard className="p-5">
            <form onSubmit={handleSaveSupplement} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Текст и фото дополнения</label>
                <ForumImageUpload
                  user={user}
                  imageUrls={supplementImageUrls}
                  onInsertUrl={(url) => setSupplementImageUrls((prev) => [...prev, url])}
                  onRemoveUrl={(url) => setSupplementImageUrls((prev) => prev.filter((u) => u !== url))}
                  disabled={savingSupplement}
                />
                <textarea
                  value={supplementContent}
                  onChange={(e) => setSupplementContent(e.target.value)}
                  placeholder="Добавьте текст к теме..."
                  rows={6}
                  className="mt-2 min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingSupplement}
                  className="rounded-2xl bg-[#2f6fed] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {savingSupplement ? 'Сохранение…' : 'Дополнить'}
                </button>
                <button
                  type="button"
                  onClick={cancelAddSupplement}
                  disabled={savingSupplement}
                  className="rounded-2xl border border-white/20 bg-[#1a2230] px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-[#243040] disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          </SurfaceCard>
        ) : null}

        <SurfaceCard className="p-5 min-w-0 overflow-x-auto">
          <article className="min-w-0 break-words">{renderForumContent(topic.content)}</article>
          {supplements.length > 0 && (
            <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
              {supplements.map((sup) => (
                <div key={sup.id} className="min-w-0 break-words">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Дополнено ({formatDate(sup.created_at)})</p>
                  <div className="text-sm text-zinc-200">{renderForumContent(sup.content)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  {user ? (
                    <button
                      type="button"
                      onClick={toggleTopicLike}
                      className="flex items-center gap-1 rounded p-0.5 text-zinc-400 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      aria-label={topicLikedByMe ? 'Убрать лайк' : 'Нравится'}
                    >
                      <Heart
                        className={`h-4 w-4 ${topicLikedByMe ? 'fill-red-500 text-red-500' : ''}`}
                        strokeWidth={2}
                      />
                    </button>
                  ) : null}
                  <span>{topicLikesCount}</span>
                </span>
                <span className="flex items-center gap-1" title="Просмотры">
                  <Eye className="h-4 w-4" strokeWidth={2} />
                  <span>{topic.views_count}</span>
                </span>
                <span className="flex items-center gap-1" title="Комментарии">
                  <MessageCircle className="h-4 w-4" strokeWidth={2} />
                  <span>{topic.replies_count}</span>
                </span>
              </div>
              <div className="text-zinc-500">
                {topic.edited_at ? (
                  <span>Изменено {formatDate(topic.edited_at)}</span>
                ) : (
                  <span>{formatDate(topic.created_at)}</span>
                )}
              </div>
            </div>
        </SurfaceCard>

        <div id="comments">
        {posts.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-zinc-400">Комментарии</h2>
            <ul className="flex flex-col gap-3">
              {posts.map((p) => (
                <li key={p.id} className="min-w-0 rounded-2xl bg-[#141a22] px-5 py-4">
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
                    <span className="font-medium text-zinc-200">{authorsMap[p.user_id]?.display_name?.trim() || 'Участник'}</span>
                  </div>
                  <div className="mt-2 min-w-0 break-words overflow-x-auto">{renderForumContent(p.content)}</div>
                  <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      {user ? (
                        <button
                          type="button"
                          onClick={() => togglePostLike(p.id)}
                          className="flex items-center gap-1 rounded p-0.5 text-zinc-400 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          aria-label={postLikedByMe[p.id] ? 'Убрать лайк' : 'Нравится'}
                        >
                          <Heart
                            className={`h-4 w-4 ${postLikedByMe[p.id] ? 'fill-red-500 text-red-500' : ''}`}
                            strokeWidth={2}
                          />
                        </button>
                      ) : null}
                      {(postLikesCount[p.id] ?? 0) > 0 && <span>{postLikesCount[p.id]}</span>}
                    </span>
                    <span>{formatTime(p.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form onSubmit={handleReply} className="mt-4">
          {replyImageUrls.length > 0 && (
            <ForumImagePreviewGrid
              urls={replyImageUrls}
              onRemove={(url) => setReplyImageUrls((prev) => prev.filter((u) => u !== url))}
              disabled={submitting}
              className="mb-2"
            />
          )}
          {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
          <div className="relative flex items-end gap-1 rounded-2xl border border-white/10 bg-[#10161f] px-2 py-2" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 ${emojiPickerOpen ? 'bg-white/10 text-zinc-200' : ''}`}
              aria-label="Смайлик"
              aria-expanded={emojiPickerOpen}
            >
              <Smile className="h-5 w-5" />
            </button>
            {emojiPickerOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-1 max-h-[240px] w-72 overflow-y-auto rounded-xl border border-white/10 bg-[#1a2230] p-2 shadow-lg [scrollbar-width:thin]">
                <div className="grid grid-cols-8 gap-1">
                  {sortedReplyEmojis.map((emoji, idx) => (
                    <button
                      key={`${idx}-${emoji}`}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              ref={replyTextareaRef}
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value)
                adjustReplyTextareaHeight()
              }}
              onFocus={adjustReplyTextareaHeight}
              placeholder="Ваш комментарий..."
              rows={1}
              className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            <input
              ref={replyFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={onReplyAttach}
              disabled={submitting || attaching}
            />
            {replyText.trim().length === 0 && replyImageUrls.length < 5 && (
              <button
                type="button"
                onClick={() => replyFileInputRef.current?.click()}
                disabled={submitting || attaching}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
                aria-label="Прикрепить фото"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            )}
            {hasReplyContent && (
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2f6fed] text-white hover:bg-[#2563eb] disabled:opacity-50"
                aria-label="Отправить"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>
        </div>

        <BackButton fallbackHref={`/forum/${slug}`} className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          Назад к темам
        </BackButton>
      </div>
    </AppPage>
  )
}
