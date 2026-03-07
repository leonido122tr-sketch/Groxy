'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { PageLoader } from '@/app/components/PageLoader'
import { Alert } from '@/app/components/Alert'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError && !sessionError.message?.includes('Refresh Token')) {
          console.error('Ошибка сессии:', sessionError)
        }

        if (!session) {
          const hash = typeof window !== 'undefined' ? window.location.hash : ''
          const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

          const hasToken =
            hash.includes('access_token') ||
            hash.includes('type=recovery') ||
            searchParams?.has('access_token') ||
            searchParams?.has('type=recovery')

          if (!hasToken) {
            setError('Ссылка для сброса пароля недействительна или истекла. Пожалуйста, запросите новую.')
            setTimeout(() => router.push('/forgot-password'), 3000)
          } else {
            setTimeout(async () => {
              const { data: { session: newSession } } = await supabase.auth.getSession()
              if (!newSession) {
                setError('Не удалось обработать ссылку для сброса пароля. Пожалуйста, запросите новую.')
                setTimeout(() => router.push('/forgot-password'), 3000)
              }
            }, 500)
          }
        }
      } catch (err: unknown) {
        if (isSupabaseNetworkError(err)) {
          setError('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
        } else {
          setError('Ошибка проверки сессии. Пожалуйста, запросите новую ссылку для сброса пароля.')
        }
        setTimeout(() => router.push('/forgot-password'), 3000)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [router, supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка при сбросе пароля'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return <PageLoader message="Проверка ссылки..." />
  }

  if (error && !success) {
    return (
      <div className="relative flex min-h-app pt-safe pb-safe items-center justify-center overflow-hidden bg-black font-sans text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        </div>
        <main className="relative z-10 w-full max-w-md px-6">
          <div className="glass-strong rounded-3xl p-6 shadow-2xl">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20">
              <KeyRound className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="heading-page mb-6">Ошибка</h1>
            <Alert variant="error">{error}</Alert>
            <p className="mt-4 text-center text-sm text-zinc-400">
              Перенаправление на страницу восстановления пароля...
            </p>
          </div>
        </main>
      </div>
    )
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
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <h1 className="heading-page">Новый пароль</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {success ? 'Пароль изменён' : 'Введите новый пароль для вашего аккаунта'}
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <Alert variant="success">
                <p className="font-medium">Пароль успешно изменён!</p>
                <p className="mt-2">Теперь вы можете войти с новым паролем.</p>
              </Alert>
              <p className="text-center text-sm text-zinc-400">Перенаправление на страницу входа...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-zinc-200">
                    Новый пароль
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="input-base"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Минимум 6 символов</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-zinc-200">
                    Подтвердите новый пароль
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="input-base"
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary btn-hover">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Сохранение...
                    </span>
                  ) : (
                    'Сохранить новый пароль'
                  )}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться к входу
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
