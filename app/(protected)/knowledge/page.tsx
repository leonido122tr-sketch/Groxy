'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ForwardIcon, IconBadge, KnowledgeIcon } from '@/app/components/AppIcons'
import { KNOWLEDGE_PAGES, KNOWLEDGE_SLUGS } from '@/lib/knowledge/constants'

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const filteredSlugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return KNOWLEDGE_SLUGS
    return KNOWLEDGE_SLUGS.filter((slug) => {
      const page = KNOWLEDGE_PAGES[slug]
      if (!page) return false
      return (
        page.title.toLowerCase().includes(q) ||
        (page.description && page.description.toLowerCase().includes(q))
      )
    })
  }, [searchQuery])

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="p-5">
          <div className="flex items-start gap-3">
            <IconBadge tone="amber" size="sm">
              <KnowledgeIcon className="h-5 w-5" />
            </IconBadge>
            <div>
              <h2 className="text-2xl font-semibold text-white">База знаний</h2>
              <p className="mt-1 text-sm text-zinc-300">Справочные материалы, инструкции и ответы по строительству.</p>
            </div>
          </div>
        </SurfaceCard>

        <div className="rounded-2xl border border-white/10 bg-[#141a22] px-4 py-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по разделам..."
            className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none"
            aria-label="Поиск по разделам"
          />
        </div>

        <div className="space-y-3">
          {filteredSlugs.map((slug) => {
            const page = KNOWLEDGE_PAGES[slug]
            if (!page) return null
            return (
              <Link key={slug} href={`/knowledge/${slug}`} className="block rounded-[22px] active:scale-[0.995]">
                <SurfaceCard className="relative overflow-hidden p-0">
                  {page.imageUrl ? (
                    <>
                      <img
                        src={page.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-50"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50"
                        aria-hidden
                      />
                      <div className="relative z-10 flex min-h-[88px] items-center gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <span className="text-base font-medium text-white drop-shadow-sm">{page.title}</span>
                          {page.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-300">{page.description}</p>
                          )}
                        </div>
                        <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[88px] items-center gap-4 p-4">
                      <IconBadge tone="amber" size="sm">
                        <KnowledgeIcon className="h-5 w-5" />
                      </IconBadge>
                      <div className="min-w-0 flex-1">
                        <span className="text-base font-medium text-white">{page.title}</span>
                        {page.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{page.description}</p>
                        )}
                      </div>
                      <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-500" />
                    </div>
                  )}
                </SurfaceCard>
              </Link>
            )
          })}
        </div>

        {filteredSlugs.length === 0 && (
          <p className="rounded-2xl bg-[#141a22] px-5 py-6 text-center text-sm text-zinc-500">
            Ничего не найдено. Измените запрос или <Link href="/search" className="text-cyan-400 hover:underline">перейдите к полному поиску</Link> (база знаний и форум).
          </p>
        )}

        <p className="text-center">
          <Link href="/search" className="text-sm text-zinc-500 hover:text-zinc-400">
            Полный поиск по базе знаний и форуму →
          </Link>
        </p>
      </div>
    </AppPage>
  )
}
