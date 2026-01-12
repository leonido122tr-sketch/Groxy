'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
    } catch (error: any) {
      console.error('Полная ошибка восстановления пароля:', error)
      const errorMessage = error.message || 'Ошибка при восстановлении пароля'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
      <main className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-white">
          Восстановление пароля
        </h1>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-900/20 p-4 text-sm text-green-400">
              <p className="font-medium">Письмо отправлено!</p>
              <p className="mt-2">
                Мы отправили инструкции по восстановлению пароля на адрес{' '}
                <span className="font-medium text-white">{email}</span>
              </p>
              <p className="mt-2">
                Проверьте вашу почту и перейдите по ссылке в письме для сброса пароля.
              </p>
            </div>
            <p className="text-center text-sm text-zinc-400">
              Перенаправление на страницу входа...
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-zinc-400">
              Введите ваш email адрес, и мы отправим вам инструкции по восстановлению пароля.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-[#ccc] disabled:opacity-50"
              >
                {loading ? 'Отправка...' : 'Отправить инструкции'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              Вспомнили пароль?{' '}
              <Link
                href="/login"
                className="font-medium text-white hover:underline"
              >
                Войти
              </Link>
            </p>
          </>
        )}

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:underline"
          >
            ← На главную
          </Link>
        </p>
      </main>
    </div>
  )
}

