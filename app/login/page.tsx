'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  } catch (err: any) {
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
      } catch (error: any) {
        console.error('Ошибка проверки сессии:', error);
        // Если это ошибка refresh token, очищаем сессию
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid Refresh Token')) {
          try {
            if (supabase) {
              await supabase.auth.signOut();
            }
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError);
          }
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
    } catch (error: any) {
      console.error('Полная ошибка входа:', error)
      const errorMessage = error.message || 'Ошибка при входе'
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
        <p className="text-zinc-400">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
      <main className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-white">
          Вход
        </h1>
        
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300"
              >
                Пароль
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-white hover:underline"
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
              className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-[#ccc] disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Нет аккаунта?{' '}
          <Link
            href="/register"
            className="font-medium text-white hover:underline"
          >
            Зарегистрироваться
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

