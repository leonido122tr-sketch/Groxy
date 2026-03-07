'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Alert } from '@/app/components/Alert'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'register' | 'verify'>('register') // Шаг: регистрация или подтверждение кода
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Функция для перевода ошибок Supabase на русский язык
  const translateError = (errorMessage: string): string => {
    const error = errorMessage.toLowerCase()
    
    // Ошибки валидации email
    if (error.includes('please include an "@"') || error.includes('include an "@"')) {
      return 'Пожалуйста, укажите символ "@" в email адресе'
    }
    if (error.includes('invalid email') || error.includes('email is invalid')) {
      return 'Некорректный email адрес'
    }
    if (error.includes('email must be a valid')) {
      return 'Email должен быть корректным адресом'
    }
    
    // Ошибки пароля
    if (error.includes('password should be at least')) {
      return 'Пароль должен содержать минимум 6 символов'
    }
    if (error.includes('password is too weak')) {
      return 'Пароль слишком слабый'
    }
    
    // Ошибки пользователя
    if (error.includes('user already registered') || error.includes('already registered')) {
      return 'Пользователь с таким email уже зарегистрирован'
    }
    if (error.includes('email already exists')) {
      return 'Email уже используется'
    }
    if (error.includes('email not confirmed') || error.includes('email_not_confirmed')) {
      return 'Email не подтвержден. Пожалуйста, проверьте вашу почту и перейдите по ссылке для подтверждения.'
    }
    
    // Общие ошибки
    if (error.includes('failed to fetch') || error.includes('network')) {
      return 'Ошибка сети: Не удалось подключиться к серверу. Проверьте интернет-соединение.'
    }
    
    // Ошибка частых запросов (rate limiting)
    if (error.includes('for security purposes') || error.includes('you can only request this after')) {
      // Извлекаем количество секунд из сообщения, если есть
      const secondsMatch = error.match(/(\d+)\s*seconds?/)
      const seconds = secondsMatch ? secondsMatch[1] : '9'
      return `По соображениям безопасности, повторный запрос можно отправить только через ${seconds} секунд(ы).`
    }
    
    // Если перевод не найден, возвращаем оригинальное сообщение
    return errorMessage
  }

  // Регистрация (отправка кода на email)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Валидация email на клиенте
    if (!email.includes('@')) {
      setError('Пожалуйста, укажите символ "@" в email адресе')
      return
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    setLoading(true)

    try {
      // Регистрируем пользователя - Supabase автоматически отправит код подтверждения на email
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Не делаем автоматический редирект, пользователь введет код в приложении
          emailRedirectTo: undefined
        }
      })

      if (error) {
        // Переводим ошибку на русский язык
        const errorMessage = error.message || ''
        throw new Error(translateError(errorMessage))
      }

      // Регистрация успешна, код отправлен на email
      // Переходим к шагу подтверждения кода
      setSuccess('Код подтверждения отправлен на вашу почту. Введите код ниже.')
      setStep('verify')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      setError(msg || 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  // Подтверждение кода и завершение регистрации
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Проверяем OTP код, который пришел на email при регистрации
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup' // Тип: signup - для подтверждения регистрации
      })

      if (error) {
        console.error('Ошибка проверки кода:', error)
        const errorMessage = (error.message || '').toLowerCase()
        
        if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
          throw new Error('Неверный или истекший код. Пожалуйста, проверьте код и попробуйте снова.')
        }
        if (errorMessage.includes('token') || errorMessage.includes('code')) {
          throw new Error('Неверный код подтверждения')
        }
        
        throw error
      }

      // Код подтвержден, регистрация завершена
      // Пользователь автоматически авторизован после подтверждения кода
      if (data?.user) {
        await supabase.from('profiles').upsert(
          {
            идентификатор: data.user.id,
            электронная_почта: data.user.email ?? '',
            отображаемое_имя: data.user.user_metadata?.full_name ?? null,
            обновлено_в: new Date().toISOString(),
          },
          { onConflict: 'идентификатор' }
        )
      }
      // Перенаправляем на страницу настройки профиля
      router.push('/profile/setup')
      router.refresh()
    } catch (error: unknown) {
      console.error('Полная ошибка проверки кода:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(errorMessage || 'Ошибка при проверке кода')
    } finally {
      setLoading(false)
    }
  }

  // Повторная отправка кода
  const handleResendCode = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Повторно отправляем код регистрации
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined
        }
      })

      if (error) {
        throw error
      }

      setSuccess('Код отправлен повторно. Проверьте вашу почту.')
    } catch (error: unknown) {
      console.error('Ошибка повторной отправки кода:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const translatedError = translateError(errorMessage)
      setError(translatedError || 'Ошибка при повторной отправке кода. Попробуйте позже.')
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">
              {step === 'register' ? 'Регистрация' : 'Подтверждение'}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {step === 'register' ? 'Создайте новый аккаунт' : 'Введите код из письма'}
            </p>
          </div>
        
          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          {success && (
            <div className="mb-6">
              <Alert variant="success">{success}</Alert>
            </div>
          )}

          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
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

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-zinc-200"
                >
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 transition-all focus:border-purple-500/50 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-zinc-200"
                >
                  Подтвердите пароль
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 transition-all focus:border-purple-500/50 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="••••••••"
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
                    Отправка кода...
                  </span>
                ) : (
                  'Зарегистрироваться'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300">
                <p>
                  Мы отправили код подтверждения на{' '}
                  <span className="font-semibold text-white">{email}</span>
                </p>
                <p className="mt-2">
                  Введите код из письма ниже для завершения регистрации.
                </p>
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-semibold text-zinc-200"
                >
                  Код подтверждения
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  maxLength={6}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-2xl tracking-widest text-white placeholder:text-zinc-500 transition-all focus:border-purple-500/50 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="000000"
                  autoComplete="one-time-code"
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
                    Проверка...
                  </span>
                ) : (
                  'Подтвердить и завершить регистрацию'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="glass w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отправить код повторно
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('register')
                  setCode('')
                  setError(null)
                  setSuccess(null)
                }}
                className="w-full text-sm text-zinc-400 transition-colors hover:text-zinc-300"
              >
                Изменить данные регистрации
              </button>
            </form>
          )}

          <div className="mt-6 space-y-4">
            <p className="text-center text-sm text-zinc-400">
              Уже есть аккаунт?{' '}
              <Link
                href="/login"
                className="font-semibold text-purple-400 transition-colors hover:text-purple-300"
              >
                Войти
              </Link>
            </p>

            <p className="text-center">
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
            <p className="text-center">
              <Link href="/privacy" className="text-sm text-zinc-500 hover:text-zinc-400">
                Политика конфиденциальности
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

