'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ChevronsRight } from 'lucide-react'
import { ForumIcon } from '@/app/components/AppIcons'
import { useAuth } from '@/lib/auth/AuthContext'
import { FORUM_BESEDKA, FORUM_DOM_I_STROYKA, FORUM_INZHENERNYE_SISTEMY } from '@/lib/forum/constants'
import { formatLastActivity } from '@/lib/forum/formatLastActivity'
import type { ForumCategory } from '@/lib/forum/types'

type CategoryStats = {
  topicCount: number
  messageCount: number
  lastActivity: string | null
}

function getTopicCount(item: { slug: string }, categoriesBySlug: Record<string, ForumCategory>, stats: Record<string, CategoryStats>): number {
  const cat = categoriesBySlug[item.slug]
  const s = cat ? stats[cat.id] : null
  return s?.topicCount ?? 0
}

function sortByTopicCount(
  items: readonly { name: string; slug: string }[],
  categoriesBySlug: Record<string, ForumCategory>,
  stats: Record<string, CategoryStats>
): { name: string; slug: string }[] {
  return [...items].sort((a, b) => getTopicCount(b, categoriesBySlug, stats) - getTopicCount(a, categoriesBySlug, stats))
}

function ForumCategoryRow({
  item,
  categoriesBySlug,
  stats,
  isFirst,
  subtitle,
}: {
  item: { name: string; slug: string }
  categoriesBySlug: Record<string, ForumCategory>
  stats: Record<string, CategoryStats>
  isFirst: boolean
  /** Подзаголовок вместо «Темы: … · Сообщения: …» */
  subtitle?: string
}) {
  const cat = categoriesBySlug[item.slug]
  const s = cat ? (stats[cat.id] ?? { topicCount: 0, messageCount: 0, lastActivity: null }) : { topicCount: 0, messageCount: 0, lastActivity: null }
  return (
    <Link
      href={`/forum/${item.slug}`}
      className={`flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-white/5 ${!isFirst ? 'border-t border-white/5' : ''}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-amber-500/90" aria-hidden>
        <ChevronsRight className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block font-medium text-white">{item.name}</span>
        <span className="mt-0.5 block text-sm text-zinc-400">
          {subtitle ?? `Темы: ${s.topicCount.toLocaleString('ru-RU')} · Сообщения: ${s.messageCount.toLocaleString('ru-RU')}`}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          Последнее: {formatLastActivity(s.lastActivity)}
        </span>
      </div>
      <ForumIcon className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
    </Link>
  )
}

export default function ForumPage() {
  const { user } = useAuth()
  const [categoriesBySlug, setCategoriesBySlug] = useState<Record<string, ForumCategory>>({})
  const [stats, setStats] = useState<Record<string, CategoryStats>>({})
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const supabase = createClient()

    supabase
      .from('forum_categories')
      .select('*')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError('Не удалось загрузить разделы. Выполните настройку форума в Supabase.')
          return
        }
        const bySlug: Record<string, ForumCategory> = {}
        ;(data ?? []).forEach((row) => {
          bySlug[(row as ForumCategory).slug] = row as ForumCategory
        })
        setCategoriesBySlug(bySlug)
      })

    Promise.all([
      supabase.from('forum_topics').select('id, category_id, updated_at'),
      supabase.from('forum_posts').select('topic_id'),
    ]).then(([topicsRes, postsRes]) => {
      if (cancelled) return
      if (topicsRes.error || postsRes.error) return
      const topics = (topicsRes.data ?? []) as { id: string; category_id: string; updated_at: string | null }[]
      const posts = (postsRes.data ?? []) as { topic_id: string }[]
      const countByTopicId: Record<string, number> = {}
      posts.forEach((p) => {
        countByTopicId[p.topic_id] = (countByTopicId[p.topic_id] ?? 0) + 1
      })
      const byCategory: Record<string, CategoryStats> = {}
      topics.forEach((row) => {
        const id = row.category_id
        if (!byCategory[id]) {
          byCategory[id] = { topicCount: 0, messageCount: 0, lastActivity: null }
        }
        byCategory[id].topicCount += 1
        byCategory[id].messageCount += 1 + (countByTopicId[row.id] ?? 0)
        const u = row.updated_at
        if (u && (!byCategory[id].lastActivity || u > byCategory[id].lastActivity!)) {
          byCategory[id].lastActivity = u
        }
      })
      setStats(byCategory)
    })

    return () => { cancelled = true }
  }, [user])

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="relative overflow-hidden p-0">
          <img
            src="/dashboard/forum.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50"
            aria-hidden
          />
          <div className="relative z-10 p-5">
            <h1 className="text-2xl font-semibold text-white drop-shadow-sm">Форум</h1>
            <p className="mt-1 text-sm text-zinc-300">Разделы по типам построек и конструкций.</p>
          </div>
        </SurfaceCard>

        {loadError && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError} В Supabase → SQL Editor выполните скрипт из файла <strong>docs/forum_schema.sql</strong>, затем <strong>docs/forum_seed_dom_i_stroyka.sql</strong>.
          </div>
        )}

        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-[#1a2332] px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Дом и стройка
            </h2>
          </div>
          <nav className="flex flex-col">
            {sortByTopicCount(FORUM_DOM_I_STROYKA, categoriesBySlug, stats).map((item, index) => (
              <ForumCategoryRow
                key={item.slug}
                item={item}
                categoriesBySlug={categoriesBySlug}
                stats={stats}
                isFirst={index === 0}
              />
            ))}
          </nav>
          <div className="border-t border-white/10 bg-[#1a2332] px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Инженерные системы
            </h2>
          </div>
          <nav className="flex flex-col">
            {sortByTopicCount(FORUM_INZHENERNYE_SISTEMY, categoriesBySlug, stats).map((item, index) => (
              <ForumCategoryRow
                key={item.slug}
                item={item}
                categoriesBySlug={categoriesBySlug}
                stats={stats}
                isFirst={index === 0}
              />
            ))}
          </nav>
          <div className="border-t border-white/10 bg-[#1a2332] px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Не только о стройке
            </h2>
          </div>
          <nav className="flex flex-col">
            {FORUM_BESEDKA.map((item, index) => (
              <ForumCategoryRow
                key={item.slug}
                item={item}
                categoriesBySlug={categoriesBySlug}
                stats={stats}
                isFirst={index === 0}
              />
            ))}
          </nav>
        </SurfaceCard>
      </div>
    </AppPage>
  )
}
