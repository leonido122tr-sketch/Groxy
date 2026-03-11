'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Alert } from '@/app/components/Alert'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { BackButton } from '@/app/components/BackButton'
import {
  BackIcon,
  IconBadge,
  SignupIcon,
  StackIcon,
  VerifyIcon,
} from '@/app/components/AppIcons'

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
    <AppPage width="md" className="justify-center py-6">
      <div className="space-y-4">
        <div className="grid gap-3">
          <SurfaceCard className="p-4">
            <div className="flex items-start gap-3">
              <IconBadge tone="violet" size="sm">
                <SignupIcon className="h-5 w-5" />
              </IconBadge>
              <div>
                <p className="text-sm font-semibold text-white">Новый аккаунт</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">Создайте аккаунт, чтобы сохранять проекты и работать с данными в Groxy.</p>
              </div>
            </div>
          </SurfaceCard>
          <SurfaceCard className="p-4">
            <div className="flex items-start gap-3">
              <IconBadge tone="blue" size="sm">
                <StackIcon className="h-5 w-5" />
              </IconBadge>
              <div>
                <p className="text-sm font-semibold text-white">Рабочая среда</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">Проекты, расчёты, материалы и знания будут связаны внутри одной платформы.</p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard accent className="p-5">
          <div className="mb-6 text-center">
            <IconBadge tone="violet" size="lg" className="mb-3 inline-flex">
              <VerifyIcon className="h-7 w-7" />
            </IconBadge>
            <h1 className="text-2xl font-semibold text-white">
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
                  className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#2f6fed] px-4 py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="rounded-2xl bg-[#1b2430] p-4 text-sm text-zinc-200">
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
                  className="w-full rounded-2xl border border-white/10 bg-[#10161f] px-4 py-3 text-center text-2xl tracking-widest text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#2f6fed] px-4 py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full rounded-2xl bg-[#141a22] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="font-semibold text-blue-300"
              >
                Войти
              </Link>
            </p>

            <p className="text-center">
              <BackButton
                fallbackHref="/"
                className="inline-flex items-center gap-2 text-sm text-zinc-400"
              >
                <BackIcon className="h-4 w-4" />
                На главную
              </BackButton>
            </p>
            <p className="text-center text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-zinc-400">Политика конфиденциальности</Link>
              {' · '}
              <Link href="/terms" className="hover:text-zinc-400">Условия использования</Link>
            </p>
          </div>
        </SurfaceCard>
      </div>
    </AppPage>
  )
}

