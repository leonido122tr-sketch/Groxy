'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BackIcon } from '@/app/components/AppIcons'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { PageLoader } from '@/app/components/PageLoader'
import { ForumImageUpload } from '../../components/ForumImageUpload'
import { CONTENT_IMAGES_DELIMITER } from '@/lib/forum/renderForumContent'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ForumCategory } from '@/lib/forum/types'

export function NewTopicClient({ slug }: { slug: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [topicText, setTopicText] = useState('')
  const [topicImageUrls, setTopicImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !user) {
      setCategoryLoading(false)
      return
    }
    const supabase = createClient()
    supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setCategory(data as ForumCategory)
      })
      .then(() => setCategoryLoading(false), () => setCategoryLoading(false))
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

  if (categoryLoading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />

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
          <h1 className="text-2xl font-semibold text-white">Новая тема</h1>
          <p className="mt-1 text-sm text-zinc-400">{category.name}</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
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
              className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              className="min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-[#2f6fed] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? 'Создание…' : 'Создать тему'}
            </button>
            <Link
              href={`/forum/${slug}`}
              className="rounded-2xl bg-[#141a22] px-5 py-2.5 text-sm font-medium text-white"
            >
              Отмена
            </Link>
          </div>
        </form>
        </SurfaceCard>

        <BackButton fallbackHref={`/forum/${slug}`} className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          Назад к темам
        </BackButton>
      </div>
    </AppPage>
  )
}
