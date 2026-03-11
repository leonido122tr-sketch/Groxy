'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ForumIcon, ForwardIcon, IconBadge } from '@/app/components/AppIcons'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ForumCategory } from '@/lib/forum/types'

export default function ForumPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({})
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError('Не удалось загрузить разделы. Выполните настройку форума в Supabase.')
          return
        }
        setCategories((data ?? []) as ForumCategory[])
      })
    supabase
      .from('forum_topics')
      .select('category_id')
      .then(({ data }) => {
        if (cancelled || !data) return
        const counts: Record<string, number> = {}
        data.forEach((r) => {
          counts[r.category_id] = (counts[r.category_id] ?? 0) + 1
        })
        setTopicCounts(counts)
      })
    return () => { cancelled = true }
  }, [user])

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="p-5">
          <h1 className="text-2xl font-semibold text-white">Форум</h1>
          <p className="mt-1 text-sm text-zinc-300">Разделы по типам построек и конструкций.</p>
        </SurfaceCard>

        {loadError && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError} В Supabase → SQL Editor выполните скрипт из файла <strong>docs/forum_schema.sql</strong>.
          </div>
        )}

        <nav className="flex flex-col gap-2">
          {categories.length === 0 && (
            <div className="rounded-2xl bg-[#141a22] px-5 py-6 text-center text-sm text-zinc-400">
              {loadError ? (
                'Разделы не загружены.'
              ) : (
                <>
                  <p>Загрузка разделов…</p>
                  <p className="mt-2 text-xs">Если разделы не появились — выполните в Supabase (SQL Editor) скрипт <strong>docs/forum_schema.sql</strong></p>
                </>
              )}
            </div>
          )}
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/forum/${cat.slug}`}
              className="flex min-h-[84px] items-center justify-between rounded-[22px] border border-white/10 bg-[#141a22] px-5 py-4 active:scale-[0.995]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <IconBadge tone="blue" size="sm">
                  <ForumIcon className="h-4 w-4" />
                </IconBadge>
                <div className="min-w-0">
                  <span className="block text-base font-medium text-white">{cat.name}</span>
                  <span className="text-sm text-zinc-400">{topicCounts[cat.id] ?? 0} тем</span>
                </div>
              </div>
              <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-500" />
            </Link>
          ))}
        </nav>
      </div>
    </AppPage>
  )
}
