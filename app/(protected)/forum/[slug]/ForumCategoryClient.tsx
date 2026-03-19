'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Heart, Eye, MessageCircle } from 'lucide-react'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon, ForwardIcon } from '@/app/components/AppIcons'
import { getImageUrlsFromContent, parseContent } from '@/lib/forum/renderForumContent'
import { getAvatarDisplayUrl } from '@/lib/avatar/uploadAvatar'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ForumCategory } from '@/lib/forum/types'
import type { ForumTopicWithAuthor } from '@/lib/forum/types'

type AuthorInfo = { display_name: string | null; email: string | null; avatar: string | null }

/** Столбцы public.profiles в БД — русские имена */
type ProfileRow = {
  идентификатор: string
  отображаемое_имя: string | null
  электронная_почта: string | null
  аватар: string | null
}

export function ForumCategoryClient({ slug }: { slug: string }) {
  const { user } = useAuth()
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [topics, setTopics] = useState<ForumTopicWithAuthor[]>([])
  const [repliesCountByTopicId, setRepliesCountByTopicId] = useState<Record<string, number>>({})
  const [topicLikesCount, setTopicLikesCount] = useState<Record<string, number>>({})
  const [topicLikedByMe, setTopicLikedByMe] = useState<Record<string, boolean>>({})
  const [authorsMap, setAuthorsMap] = useState<Record<string, AuthorInfo>>({})
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!slug || !user) return
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) {
          if (!cancelled) setCategory(null)
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
        if (cancelled || !res?.data) return
        const list = res.data as ForumTopicWithAuthor[]
        setTopics(list)
        const topicIds = list.map((t) => t.id)
        if (topicIds.length > 0) {
          const { data: posts } = await supabase
            .from('forum_posts')
            .select('topic_id')
            .in('topic_id', topicIds)
          const countByTopic: Record<string, number> = {}
          topicIds.forEach((id) => { countByTopic[id] = 0 })
          ;(posts ?? []).forEach((row: { topic_id: string }) => {
            countByTopic[row.topic_id] = (countByTopic[row.topic_id] ?? 0) + 1
          })
          if (!cancelled) setRepliesCountByTopicId(countByTopic)
        }
        if (topicIds.length > 0) {
          Promise.all([
            supabase.from('forum_topic_likes').select('topic_id').in('topic_id', topicIds),
            user
              ? supabase.from('forum_topic_likes').select('topic_id').eq('user_id', user.id).in('topic_id', topicIds)
              : Promise.resolve({ data: [] as { topic_id: string }[] }),
          ]).then(([countRes, myRes]) => {
            if (cancelled) return
            const byTopic: Record<string, number> = {}
            topicIds.forEach((id) => { byTopic[id] = 0 })
            ;(countRes.data ?? []).forEach((row: { topic_id: string }) => {
              byTopic[row.topic_id] = (byTopic[row.topic_id] ?? 0) + 1
            })
            setTopicLikesCount(byTopic)
            const likedByMe: Record<string, boolean> = {}
            topicIds.forEach((id) => { likedByMe[id] = false })
            ;(myRes.data ?? []).forEach((row: { topic_id: string }) => {
              likedByMe[row.topic_id] = true
            })
            setTopicLikedByMe(likedByMe)
          })
        }
        const userIds = [...new Set(list.map((t) => t.user_id).filter(Boolean))]
        if (userIds.length === 0) return
        const { data: profiles } = await supabase
          .from('profiles')
          .select('идентификатор, отображаемое_имя, электронная_почта, аватар')
          .in('идентификатор', userIds)
        const map: Record<string, AuthorInfo> = {}
        const profileList = (profiles ?? []) as unknown as ProfileRow[]
        for (const p of profileList) {
          map[p.идентификатор] = {
            display_name: p.отображаемое_имя ?? null,
            email: p.электронная_почта ?? null,
            avatar: p.аватар ?? null,
          }
        }
        setAuthorsMap(map)
        const urls: Record<string, string> = {}
        await Promise.all(
          profileList.map(async (p: ProfileRow) => {
            const url = await getAvatarDisplayUrl(supabase, p.аватар)
            if (url) urls[p.идентификатор] = url
          })
        )
        if (!cancelled) setAvatarUrls(urls)
      })
    return () => { cancelled = true }
  }, [slug, user])

  const toggleTopicLike = async (e: React.MouseEvent, topicId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const supabase = createClient()
    const liked = topicLikedByMe[topicId]
    if (liked) {
      await supabase.from('forum_topic_likes').delete().eq('topic_id', topicId).eq('user_id', user.id)
      setTopicLikesCount((prev) => ({ ...prev, [topicId]: Math.max(0, (prev[topicId] ?? 0) - 1) }))
      setTopicLikedByMe((prev) => ({ ...prev, [topicId]: false }))
    } else {
      await supabase.from('forum_topic_likes').insert({ topic_id: topicId, user_id: user.id })
      setTopicLikesCount((prev) => ({ ...prev, [topicId]: (prev[topicId] ?? 0) + 1 }))
      setTopicLikedByMe((prev) => ({ ...prev, [topicId]: true }))
    }
  }

  if (!category) {
    return (
      <AppPage header={<AppHeader />} width="md" className="py-5">
          <p className="text-zinc-400">Раздел не найден.</p>
          <BackButton fallbackHref="/forum" className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-300">
            <BackIcon className="h-4 w-4" />
            К форуму
          </BackButton>
      </AppPage>
    )
  }

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-white">{category.name}</h1>
              <p className="mt-0.5 text-sm text-zinc-400">{topics.length} тем</p>
            </div>
          <Link
            href={`/forum/${slug}/new`}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#2f6fed] px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Новая тема
          </Link>
          </div>
        </SurfaceCard>

        <ul className="flex flex-col gap-2">
          {topics.length === 0 ? (
            <li className="rounded-2xl bg-[#141a22] px-5 py-6 text-center text-sm text-zinc-400">
              Пока нет тем. Создайте первую.
            </li>
          ) : (
            topics.map((t) => {
              const firstImage = getImageUrlsFromContent(t.content ?? '')[0]
              const previewText = parseContent(t.content ?? '').text.trim()
              const previewShort = previewText.length > 150 ? previewText.slice(0, 150) + '…' : previewText
              return (
                <li key={t.id}>
                  <Link
                    href={`/forum/${slug}?topic=${t.id}`}
                    className="block overflow-hidden rounded-2xl bg-[#141a22]"
                  >
                    <div className="px-5 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-white">{t.title}</span>
                        {t.pinned && (
                          <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                            Закреплено
                          </span>
                        )}
                      </div>
                      {previewShort && (
                        <p className="mt-2 line-clamp-2 break-words text-sm text-zinc-400">
                          {previewShort}
                        </p>
                      )}
                    </div>
                    {firstImage && (
                      <div className="mt-3 w-full overflow-hidden bg-[#10161f]">
                        <img
                          src={firstImage}
                          alt=""
                          className="max-h-[420px] w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="flex items-center gap-1">
                            {user ? (
                              <button
                                type="button"
                                onClick={(e) => toggleTopicLike(e, t.id)}
                                className="flex items-center gap-1 rounded p-0.5 text-zinc-400 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-label={topicLikedByMe[t.id] ? 'Убрать лайк' : 'Нравится'}
                              >
                                <Heart
                                  className={`h-4 w-4 ${topicLikedByMe[t.id] ? 'fill-red-500 text-red-500' : ''}`}
                                  strokeWidth={2}
                                />
                              </button>
                            ) : (
                              <Heart className="h-4 w-4" strokeWidth={2} />
                            )}
                            <span>{topicLikesCount[t.id] ?? 0}</span>
                          </span>
                          <span className="flex items-center gap-1" title="Просмотры">
                            <Eye className="h-4 w-4" strokeWidth={2} />
                            <span>{t.views_count}</span>
                          </span>
                          <Link
                            href={`/forum/${slug}?topic=${t.id}#comments`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 rounded p-0.5 text-zinc-400 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            title="Комментарии"
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={2} />
                            <span>{repliesCountByTopicId[t.id] ?? t.replies_count}</span>
                          </Link>
                        </div>
                        <div className="text-zinc-500">
                          {'edited_at' in t && t.edited_at ? (
                            <span>
                              Изменено {new Date(t.edited_at).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span>
                              {new Date(t.created_at ?? t.updated_at).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-xs text-zinc-500">
                        <div className="flex items-center gap-2">
                          {avatarUrls[t.user_id] ? (
                            <img
                              src={avatarUrls[t.user_id]}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-full object-cover bg-[#1a2230]"
                            />
                          ) : (
                            <div className="h-8 w-8 shrink-0 rounded-full bg-[#1a2230] flex items-center justify-center text-[10px] font-medium text-zinc-500">
                              {(authorsMap[t.user_id]?.display_name?.trim() || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <span>Автор: {authorsMap[t.user_id]?.display_name?.trim() || 'Участник'}</span>
                        </div>
                        <ForwardIcon className="h-4 w-4 shrink-0" />
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })
          )}
        </ul>

        <BackButton fallbackHref="/forum" className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          Назад к разделам
        </BackButton>
      </div>
    </AppPage>
  )
}
