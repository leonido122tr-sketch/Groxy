'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'
import { Alert } from '@/app/components/Alert'

const TOPICS = [
  { value: 'problem', label: 'Проблема' },
  { value: 'suggestion', label: 'Предложение' },
  { value: 'question', label: 'Вопрос' },
  { value: 'other', label: 'Другое' },
] as const

export default function SupportPage() {
  const [topic, setTopic] = useState<string>(TOPICS[0].value)
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const prefetchContact = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) setContact(user.email)
      } catch {
        // ignore
      }
    }
    prefetchContact()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error: insertError } = await supabase.from('feedback').insert({
        topic,
        message: message.trim(),
        contact: contact.trim() || null,
        user_id: user?.id ?? null,
      })
      if (insertError) throw insertError
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось отправить сообщение.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AppPage width="md" className="py-6">
        <div className="space-y-4">
          <SurfaceCard accent className="p-6 text-center">
            <p className="text-lg font-semibold text-white">Спасибо, сообщение отправлено</p>
            <p className="mt-2 text-sm text-zinc-300">
              Мы рассмотрим ваше обращение и ответим при необходимости.
            </p>
            <p className="mt-6">
              <BackButton fallbackHref="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
                <BackIcon className="h-4 w-4" />
                На главную
              </BackButton>
            </p>
          </SurfaceCard>
        </div>
      </AppPage>
    )
  }

  return (
    <AppPage width="md" className="py-6">
      <div className="space-y-4">
        <p className="mb-2">
          <BackButton fallbackHref="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300">
            <BackIcon className="h-4 w-4" />
            На главную
          </BackButton>
        </p>

        <SurfaceCard className="relative overflow-hidden p-5 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/feedback-block-full.png)' }}>
          <div className="absolute inset-0 bg-[#0b0f14]/85" aria-hidden />
          <div className="relative z-10">
          <h1 className="text-xl font-semibold text-white">Обратная связь</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Опишите проблему, пожелание или вопрос. Укажите контакт для ответа (по желанию).
          </p>

          {error && (
            <div className="mt-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div>
              <label htmlFor="topic" className="mb-2 block text-sm font-semibold tracking-[0.01em] text-zinc-100">
                Тема
              </label>
              <select
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-semibold tracking-[0.01em] text-zinc-100">
                Сообщение <span className="text-zinc-500">*</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="Опишите проблему или вопрос..."
                className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y min-h-[120px]"
              />
            </div>

            <div>
              <label htmlFor="contact" className="mb-2 block text-sm font-semibold tracking-[0.01em] text-zinc-100">
                Контакт (email или телефон, по желанию)
              </label>
              <input
                id="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="email@example.com или +7..."
                className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#2f6fed] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Отправка...
                </span>
              ) : (
                'Отправить'
              )}
            </button>
          </form>
          </div>
        </SurfaceCard>
      </div>
    </AppPage>
  )
}
