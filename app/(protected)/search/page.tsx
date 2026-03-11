'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackIcon, ForwardIcon, KnowledgeIcon } from '@/app/components/AppIcons'
import { KNOWLEDGE_PAGES, KNOWLEDGE_SLUGS } from '@/lib/knowledge/constants'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ForumTopic } from '@/lib/forum/types'
import type { ForumCategory } from '@/lib/forum/types'

export default function SearchPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [knowledgeHits, setKnowledgeHits] = useState<{ slug: string; title: string; description: string }[]>([])
  const [forumHits, setForumHits] = useState<{ topic: ForumTopic; categorySlug: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase()
    if (!trimmed) {
      setKnowledgeHits([])
      setForumHits([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)

    const knowledge: { slug: string; title: string; description: string }[] = []
    for (const slug of KNOWLEDGE_SLUGS) {
      const page = KNOWLEDGE_PAGES[slug]
      if (!page) continue
      if (page.title.toLowerCase().includes(trimmed) || page.description.toLowerCase().includes(trimmed)) {
        knowledge.push({ slug, title: page.title, description: page.description })
      }
    }
    setKnowledgeHits(knowledge)

    const supabase = createClient()
    const { data: topics } = await supabase
      .from('forum_topics')
      .select('id, title, content, category_id, created_at, replies_count, views_count')
      .or(`title.ilike.%${trimmed}%,content.ilike.%${trimmed}%`)
      .limit(20)
    const topicList = (topics ?? []) as ForumTopic[]

    if (topicList.length > 0) {
      const categoryIds = [...new Set(topicList.map((t) => t.category_id))]
      const { data: categories } = await supabase
        .from('forum_categories')
        .select('id, slug')
        .in('id', categoryIds)
      const slugByCategoryId: Record<string, string> = {}
      for (const c of (categories ?? []) as { id: string; slug: string }[]) {
        slugByCategoryId[c.id] = c.slug
      }
      setForumHits(
        topicList.map((topic) => ({
          topic,
          categorySlug: slugByCategoryId[topic.category_id] ?? '',
        }))
      )
    } else {
      setForumHits([])
    }

    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(query)
  }

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="p-5">
          <h1 className="text-xl font-semibold text-white">Поиск</h1>
          <p className="mt-1 text-sm text-zinc-400">По базе знаний и темам форума</p>
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите запрос..."
                className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-[#10161f] px-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Поиск"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-[#2f6fed] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? 'Поиск…' : 'Искать'}
              </button>
            </div>
          </form>
        </SurfaceCard>

        {searched && !loading && (
          <>
            {knowledgeHits.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-medium text-zinc-400">База знаний</h2>
                <ul className="space-y-2">
                  {knowledgeHits.map(({ slug, title, description }) => (
                    <li key={slug}>
                      <Link
                        href={`/knowledge/${slug}`}
                        className="block rounded-2xl bg-[#141a22] p-4 transition hover:bg-[#1a2230]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                            <KnowledgeIcon className="h-5 w-5 text-amber-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-white">{title}</span>
                            {description && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{description}</p>
                            )}
                          </div>
                          <ForwardIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {forumHits.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-medium text-zinc-400">Форум</h2>
                <ul className="space-y-2">
                  {forumHits.map(({ topic, categorySlug }) => (
                    <li key={topic.id}>
                      <Link
                        href={categorySlug ? `/forum/${categorySlug}?topic=${topic.id}` : '/forum'}
                        className="block rounded-2xl bg-[#141a22] p-4 transition hover:bg-[#1a2230]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-white">{topic.title}</span>
                          <ForwardIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {topic.replies_count} комментариев · {topic.views_count} просмотров
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {knowledgeHits.length === 0 && forumHits.length === 0 && (
              <p className="rounded-2xl bg-[#141a22] px-5 py-6 text-center text-sm text-zinc-500">
                Ничего не найдено. Попробуйте другой запрос.
              </p>
            )}
          </>
        )}

        <p className="text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300">
            <BackIcon className="h-4 w-4" />
            На главную
          </Link>
        </p>
      </div>
    </AppPage>
  )
}
