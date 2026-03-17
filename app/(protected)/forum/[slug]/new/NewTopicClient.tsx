'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Smile, Paperclip, Send } from 'lucide-react'
import { BackIcon } from '@/app/components/AppIcons'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { PageLoader } from '@/app/components/PageLoader'
import { CONTENT_IMAGES_DELIMITER } from '@/lib/forum/renderForumContent'
import { FORUM_EMOJI_USAGE_KEY, FORUM_EMOJIS } from '@/lib/forum/forumEmoji'
import { uploadForumImage } from '@/lib/forum/uploadForumImage'
import { ForumImagePreviewGrid } from '@/app/(protected)/forum/components/ForumImagePreviewGrid'
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [emojiUsage, setEmojiUsage] = useState<Record<string, number>>({})
  const [attaching, setAttaching] = useState(false)
  const topicTextareaRef = useRef<HTMLTextAreaElement>(null)
  const topicFileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

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

  const onAttach = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !user) return
      if (topicImageUrls.length >= 5) return
      setAttaching(true)
      try {
        const supabase = createClient()
        const url = await uploadForumImage(supabase, file, user.id)
        if (url) setTopicImageUrls((prev) => (prev.length >= 5 ? prev : [...prev, url]))
      } finally {
        setAttaching(false)
      }
    },
    [user, topicImageUrls.length]
  )

  const adjustTextareaHeight = useCallback(() => {
    const ta = topicTextareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [])

  const insertEmoji = useCallback(
    (emoji: string) => {
      const ta = topicTextareaRef.current
      if (!ta) {
        setTopicText((prev) => prev + emoji)
      } else {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const before = topicText.slice(0, start)
        const after = topicText.slice(end)
        const next = before + emoji + after
        setTopicText(next)
        requestAnimationFrame(() => {
          ta.focus()
          const newPos = start + emoji.length
          ta.setSelectionRange(newPos, newPos)
          adjustTextareaHeight()
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
    [topicText, adjustTextareaHeight]
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

  const sortedReplyEmojis = useMemo(
    () => [...FORUM_EMOJIS].sort((a, b) => (emojiUsage[b] ?? 0) - (emojiUsage[a] ?? 0)),
    [emojiUsage]
  )

  const hasContent = Boolean(title.trim() && (topicText.trim() || topicImageUrls.length > 0))

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

          {topicImageUrls.length > 0 && (
            <ForumImagePreviewGrid
              urls={topicImageUrls}
              onRemove={(url) => setTopicImageUrls((prev) => prev.filter((u) => u !== url))}
              disabled={submitting}
            />
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="relative flex min-h-[48px] items-end gap-1 rounded-2xl border border-white/10 bg-[#10161f] px-2 py-2">
            <button
              type="button"
              onClick={() => setEmojiPickerOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              aria-label="Эмодзи"
            >
              <Smile className="h-5 w-5" />
            </button>
            {emojiPickerOpen && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full left-0 z-10 mb-1 max-h-[200px] w-[280px] overflow-y-auto rounded-xl border border-white/10 bg-[#141a22] p-2 shadow-xl"
              >
                <div className="grid grid-cols-8 gap-1">
                  {sortedReplyEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="rounded p-1 text-lg leading-none hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              ref={topicTextareaRef}
              value={topicText}
              onChange={(e) => {
                setTopicText(e.target.value)
                requestAnimationFrame(adjustTextareaHeight)
              }}
              onFocus={adjustTextareaHeight}
              placeholder="Введите текст"
              rows={1}
              className="min-h-[28px] flex-1 resize-none bg-transparent px-2 py-2 text-white placeholder-zinc-500 focus:outline-none"
            />
            <input
              ref={topicFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAttach}
            />
            {topicText.trim().length === 0 && topicImageUrls.length < 5 && (
              <button
                type="button"
                onClick={() => topicFileInputRef.current?.click()}
                disabled={submitting || attaching}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-200 disabled:opacity-50"
                aria-label="Прикрепить фото"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            )}
            {hasContent && (
              <button
                type="submit"
                disabled={submitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f6fed] text-white hover:bg-[#2563eb] disabled:opacity-50"
                aria-label="Создать тему"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex gap-3">
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
