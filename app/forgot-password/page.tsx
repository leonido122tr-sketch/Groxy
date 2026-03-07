'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Alert } from '@/app/components/Alert'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      // Получаем URL для перенаправления после сброса пароля
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/reset-password`
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        console.error('Ошибка восстановления пароля:', error)
        // Переводим ошибки валидации email
        const errorMessage = error.message || ''
        if (errorMessage.toLowerCase().includes('please include an "@"') || 
            errorMessage.toLowerCase().includes('include an "@"')) {
          throw new Error('Пожалуйста, укажите символ "@" в email адресе')
        }
        if (errorMessage.toLowerCase().includes('invalid email') || 
            errorMessage.toLowerCase().includes('email is invalid')) {
          throw new Error('Некорректный email адрес')
        }
        if (errorMessage.toLowerCase().includes('user not found') || 
            errorMessage.toLowerCase().includes('no user found')) {
          throw new Error('Пользователь с таким email не найден')
        }
        throw error
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error: unknown) {
      console.error('Полная ошибка восстановления пароля:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при восстановлении пароля'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-app pt-safe pb-safe items-center justify-center overflow-hidden bg-black font-sans text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"></div>
      </div>

      <main className="relative z-10 w-full max-w-md px-6">
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-glow-accent">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">
              Восстановление пароля
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {success ? 'Проверьте вашу почту' : 'Введите ваш email адрес'}
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <Alert variant="success">
                <p className="font-semibold">Письмо отправлено!</p>
                <p className="mt-2">
                  Мы отправили инструкции по восстановлению пароля на адрес{' '}
                  <span className="font-semibold text-white">{email}</span>
                </p>
                <p className="mt-2 text-sm opacity-90">
                  Проверьте вашу почту и перейдите по ссылке в письме для сброса пароля.
                </p>
              </Alert>
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></div>
                <span>Перенаправление на страницу входа...</span>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-zinc-400">
                Мы отправим вам инструкции по восстановлению пароля на указанный email.
              </p>

              {error && (
                <div className="mb-6">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-zinc-200"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 transition-all focus:border-purple-500/50 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-hover gradient-accent w-full rounded-xl px-4 py-3 font-semibold text-white shadow-glow-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      Отправка...
                    </span>
                  ) : (
                    'Отправить инструкции'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-400">
                Вспомнили пароль?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-purple-400 transition-colors hover:text-purple-300"
                >
                  Войти
                </Link>
              </p>
            </>
          )}

          <p className="mt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              На главную
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

