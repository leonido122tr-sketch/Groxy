'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Alert } from '@/app/components/Alert'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  
  // Создаем клиент внутри функции, чтобы перехватить ошибки инициализации
  let supabase: SupabaseClient | null = null
  try {
    supabase = createClient()
  } catch (err: unknown) {
    console.error('Ошибка создания Supabase клиента:', err)
    // supabase будет null, обработаем это в handleLogin
  }

  // Проверяем, авторизован ли пользователь при загрузке страницы
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!supabase) {
          setCheckingAuth(false);
          return;
        }
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Обрабатываем ошибку refresh token
        if (sessionError) {
          console.error('Ошибка проверки сессии:', sessionError);
          // Если refresh token не найден или невалиден, очищаем сессию
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('Ошибка при выходе:', signOutError);
            }
          }
          setCheckingAuth(false);
          return;
        }
        
        if (session) {
          // Пользователь уже авторизован, перенаправляем на dashboard
          router.push('/dashboard');
          return;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        if (isSupabaseNetworkError(error)) {
          // Нет связи — считаем не авторизованным, показываем форму входа
        } else if (message.includes('Refresh Token') || message.includes('Invalid Refresh Token')) {
          try {
            if (supabase) await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError);
          }
        } else {
          console.error('Ошибка проверки сессии:', error);
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Проверяем, что клиент создан
      if (!supabase) {
        const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        throw new Error(
          `Не удалось инициализировать Supabase клиент. URL: ${envUrl ? '✅' : '❌'}, Key: ${envKey ? '✅' : '❌'}`
        )
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Ошибка входа:', error)
        
        // Получаем сообщение и код ошибки
        const errorMessage = (error.message || '').toLowerCase()
        const errorCode = error.code || ''
        
        // Детальная обработка разных типов ошибок
        if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
          throw new Error(
            'Ошибка сети: Не удалось подключиться к серверу. Проверьте интернет-соединение и настройки Supabase.'
          )
        }
        
        // Ошибка неправильных учетных данных (проверяем в первую очередь, так как это частая ошибка)
        if (errorCode === 'invalid_credentials' || 
            errorMessage.includes('invalid login credentials') || 
            errorMessage.includes('invalid credentials') ||
            errorMessage.includes('wrong password') ||
            errorMessage.includes('incorrect password')) {
          throw new Error('Неверный email или пароль')
        }
        
        // Переводим ошибки валидации email
        if (errorMessage.includes('please include an "@"') || 
            errorMessage.includes('include an "@"')) {
          throw new Error('Пожалуйста, укажите символ "@" в email адресе')
        }
        if (errorMessage.includes('invalid email') || 
            errorMessage.includes('email is invalid')) {
          throw new Error('Некорректный email адрес')
        }
        
        // Ошибка неподтвержденного email
        if (errorCode === 'email_not_confirmed' ||
            errorMessage.includes('email not confirmed') || 
            errorMessage.includes('email_not_confirmed')) {
          throw new Error('Email не подтвержден. Пожалуйста, проверьте вашу почту и перейдите по ссылке для подтверждения.')
        }
        
        // Если ошибка не переведена, выводим оригинальное сообщение
        throw error
      }

      console.log('Успешный вход:', data)
      router.push('/dashboard')
      router.refresh()
    } catch (error: unknown) {
      console.error('Полная ошибка входа:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при входе'
      setError(errorMessage)
      
      // Дополнительная информация для отладки
      if (errorMessage.includes('Failed to fetch')) {
        console.error('Детали ошибки сети:', {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          userAgent: navigator.userAgent,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-blue-500"></div>
          <p className="text-zinc-400">Загрузка...</p>
        </div>
      </div>
    );
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
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
              <Image src="/logo.png" alt="Groxy" width={56} height={56} className="h-12 w-12 object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Вход в систему
            </h1>
            <p className="mt-2 text-sm text-zinc-400">Войдите в свой аккаунт</p>
          </div>
        
          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 transition-all focus:border-blue-500/50 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-zinc-200"
                >
                  Пароль
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  Забыли пароль?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 transition-all focus:border-blue-500/50 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-hover gradient-primary w-full rounded-xl px-4 py-3 font-semibold text-white shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <p className="text-center text-sm text-zinc-400">
              Нет аккаунта?{' '}
              <Link
                href="/register"
                className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
              >
                Зарегистрироваться
              </Link>
            </p>

            <p className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-blue-400"
              >
                <ArrowLeft className="h-4 w-4" />
                На главную
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

