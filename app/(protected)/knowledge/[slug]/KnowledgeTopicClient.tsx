'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon, IconBadge, KnowledgeIcon } from '@/app/components/AppIcons'
import { KNOWLEDGE_PAGES } from '@/lib/knowledge/constants'
import { loadKnowledgeContent } from '@/lib/knowledge/loadContent'
import type { KnowledgeSection } from '@/lib/knowledge/content/concrete'

export function KnowledgeTopicClient({ slug }: { slug: string }) {
  const [content, setContent] = useState<string | KnowledgeSection[] | null>(null)
  const [loadingContent, setLoadingContent] = useState(true)

  const page = slug ? KNOWLEDGE_PAGES[slug] : null

  useEffect(() => {
    if (!slug) {
      setLoadingContent(false)
      setContent(null)
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoadingContent(true)
    })
    loadKnowledgeContent(slug)
      .then((data) => {
        if (!cancelled) setContent(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!page) {
    return (
      <AppPage header={<AppHeader />} width="md" className="py-5">
          <p className="text-zinc-400">Раздел не найден.</p>
          <BackButton fallbackHref="/knowledge" className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-300">
            <BackIcon className="h-4 w-4" />
            В базу знаний
          </BackButton>
      </AppPage>
    )
  }

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="relative overflow-hidden p-0">
          {page.imageUrl ? (
            <>
              <img
                src={page.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-[#121922]/90 via-[#121922]/70 to-[#121922]/90"
                aria-hidden
              />
              <div className="relative z-10 p-5">
                <h2 className="text-2xl font-semibold text-white drop-shadow-md">{page.title}</h2>
                {page.description && (
                  <p className="mt-1 text-sm text-zinc-300 drop-shadow-sm">{page.description}</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5">
              <div className="flex items-start gap-3">
                <IconBadge tone="amber" size="sm">
                  <KnowledgeIcon className="h-5 w-5" />
                </IconBadge>
                <div>
                  <h2 className="text-2xl font-semibold text-white">{page.title}</h2>
                  <p className="mt-1 text-sm text-zinc-300">{page.description}</p>
                </div>
              </div>
            </div>
          )}
        </SurfaceCard>

        {loadingContent ? (
          <div className="h-24 animate-pulse rounded-2xl bg-[#141a22]" aria-hidden />
        ) : Array.isArray(content) && content.length > 0 ? (
          <div className="space-y-6">
            {content.map((section, idx) => (
              <SurfaceCard key={idx} className="overflow-hidden p-0">
                <h3 className="px-5 pt-5 text-lg font-semibold text-white">{section.title}</h3>
                <div className="relative mt-3 aspect-[16/9] w-full overflow-hidden bg-[#1a2230]">
                  <img
                    src={section.imageUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-90"
                  />
                </div>
                <article className="whitespace-pre-wrap px-5 pb-5 pt-4 text-sm leading-relaxed text-zinc-200">
                  {section.content}
                </article>
              </SurfaceCard>
            ))}
          </div>
        ) : content && typeof content === 'string' ? (
          <SurfaceCard className="p-5">
            <article className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {content}
            </article>
          </SurfaceCard>
        ) : null}

        <BackButton fallbackHref="/knowledge" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          Назад в базу знаний
        </BackButton>
      </div>
    </AppPage>
  )
}
