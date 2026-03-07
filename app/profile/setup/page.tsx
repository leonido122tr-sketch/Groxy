'use client'

import { useState, useEffect } from 'react'
import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { PageLoader } from '@/app/components/PageLoader'
import { Alert } from '@/app/components/Alert'

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        setUser(u ?? null)
        if (u?.user_metadata?.full_name) setFullName(u.user_metadata.full_name)
        if (u?.email) setEmail(u.email)
        if (u?.user_metadata?.phone) setPhone(String(u.user_metadata.phone))
        if (!u) router.push('/login')
      } catch (err: unknown) {
        if (isSupabaseNetworkError(err)) {
          setError('Нет связи с сервером. Проверьте интернет.')
        } else {
          console.error('Ошибка загрузки профиля:', err)
          setError('Не удалось загрузить профиль.')
        }
        router.push('/login')
      }
    }
    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setError('Укажите корректный email')
        setLoading(false)
        return
      }

      if (trimmedEmail !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail })
        if (emailError) throw emailError
      }

      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      })

      if (metaError) throw metaError

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка при сохранении профиля'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <PageLoader />
  }

  return (
    <div className="relative flex min-h-app pt-safe pb-safe items-center justify-center overflow-hidden bg-black font-sans text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <main className="relative z-10 w-full max-w-md px-6">
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-glow">
              <User className="h-7 w-7 text-white" />
            </div>
            <h1 className="heading-page">Настройка профиля</h1>
            <p className="mt-2 text-sm text-zinc-400">Укажите данные для подписи PDF</p>
          </div>

          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-zinc-200">
                Полное имя
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-base"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-zinc-200">
                Номер телефона
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-base"
                placeholder="+7 (999) 123-45-67"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Указывается в подписи PDF при включённой опции «Подписать PDF»
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-hover">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Сохранение...
                </span>
              ) : (
                'Сохранить'
              )}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link
              href="/project"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-blue-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад в меню
            </Link>
          </p>
          <p className="mt-2 text-center">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              Пропустить →
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
