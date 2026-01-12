'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
      const { data, error } = await supabase.auth.signUp({
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
    } catch (error: any) {
      // Используем переведенное сообщение или дефолтное
      setError(error.message || 'Ошибка при регистрации')
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
      console.log('Регистрация завершена:', data)
      
      // Перенаправляем на страницу настройки профиля
      router.push('/profile/setup')
      router.refresh()
    } catch (error: any) {
      console.error('Полная ошибка проверки кода:', error)
      const errorMessage = error.message || 'Ошибка при проверке кода'
      setError(errorMessage)
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
    } catch (error: any) {
      console.error('Ошибка повторной отправки кода:', error)
      // Переводим ошибку на русский язык
      const errorMessage = error.message || ''
      const translatedError = translateError(errorMessage)
      setError(translatedError || 'Ошибка при повторной отправке кода. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
      <main className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-white">
          Регистрация
        </h1>
        
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-900/20 p-3 text-sm text-green-400">
            {success}
          </div>
        )}

        {step === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
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

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Подтвердите пароль
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-[#ccc] disabled:opacity-50"
            >
              {loading ? 'Отправка кода...' : 'Зарегистрироваться'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="mb-4 text-sm text-zinc-400">
              Мы отправили код подтверждения на <span className="font-medium text-white">{email}</span>
              <br />
              Введите код из письма ниже для завершения регистрации.
            </p>

            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium text-zinc-300"
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
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-center text-2xl tracking-widest text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-[#ccc] disabled:opacity-50"
            >
              {loading ? 'Проверка...' : 'Подтвердить и завершить регистрацию'}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading}
              className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
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
              className="w-full text-sm text-zinc-400 hover:underline"
            >
              Изменить данные регистрации
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          Уже есть аккаунт?{' '}
          <Link
            href="/login"
            className="font-medium text-white hover:underline"
          >
            Войти
          </Link>
        </p>

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

