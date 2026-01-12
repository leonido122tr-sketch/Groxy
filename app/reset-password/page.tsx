'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
        // Supabase автоматически обрабатывает токен из URL (hash или query params)
        // Проверяем, есть ли активная сессия или токен в URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Если есть ошибка, связанная с токеном, обрабатываем её
        if (sessionError && !sessionError.message?.includes('Refresh Token')) {
          console.error('Ошибка сессии:', sessionError)
        }
        
        // Если нет сессии, проверяем, есть ли токен в URL
        if (!session) {
          // Проверяем URL на наличие токенов восстановления пароля
          const hash = typeof window !== 'undefined' ? window.location.hash : ''
          const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
          
          const hasToken = hash.includes('access_token') || hash.includes('type=recovery') || 
                          searchParams?.has('access_token') || searchParams?.has('type=recovery')
          
          if (!hasToken) {
            setError('Ссылка для сброса пароля недействительна или истекла. Пожалуйста, запросите новую.')
            setTimeout(() => {
              router.push('/forgot-password')
            }, 3000)
          } else {
            // Есть токен в URL, Supabase обработает его автоматически
            // Дополнительно проверяем сессию после обработки токена
            setTimeout(async () => {
              const { data: { session: newSession } } = await supabase.auth.getSession()
              if (!newSession) {
                setError('Не удалось обработать ссылку для сброса пароля. Пожалуйста, запросите новую.')
                setTimeout(() => {
                  router.push('/forgot-password')
                }, 3000)
              }
            }, 500)
          }
        }
      } catch (err: any) {
        console.error('Ошибка проверки сессии:', err)
        setError('Ошибка проверки сессии. Пожалуйста, запросите новую ссылку для сброса пароля.')
        setTimeout(() => {
          router.push('/forgot-password')
        }, 3000)
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

    // Валидация
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
      // Обновляем пароль пользователя
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error('Ошибка сброса пароля:', error)
        throw error
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      console.error('Полная ошибка сброса пароля:', error)
      const errorMessage = error.message || 'Ошибка при сбросе пароля'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
        <main className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg">
          <p className="text-center text-zinc-400">Проверка ссылки...</p>
        </main>
      </div>
    )
  }

  if (error && !success) {
    return (
      <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
        <main className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold text-white">
            Ошибка
          </h1>
          <div className="rounded-lg bg-red-900/20 p-4 text-sm text-red-400">
            {error}
          </div>
          <p className="mt-4 text-center text-sm text-zinc-400">
            Перенаправление на страницу восстановления пароля...
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
      <main className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-white">
          Новый пароль
        </h1>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-900/20 p-4 text-sm text-green-400">
              <p className="font-medium">Пароль успешно изменен!</p>
              <p className="mt-2">
                Ваш пароль был успешно обновлен. Теперь вы можете войти с новым паролем.
              </p>
            </div>
            <p className="text-center text-sm text-zinc-400">
              Перенаправление на страницу входа...
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-zinc-400">
              Введите новый пароль для вашего аккаунта.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Новый пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Минимум 6 символов
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Подтвердите новый пароль
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-[#ccc] disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : 'Сохранить новый пароль'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link
            href="/login"
            className="font-medium text-white hover:underline"
          >
            ← Вернуться к входу
          </Link>
        </p>
      </main>
    </div>
  )
}

