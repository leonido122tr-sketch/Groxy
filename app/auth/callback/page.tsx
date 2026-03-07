'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        
        // Обрабатываем сессию из URL (для OAuth callback)
        const { error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          // Если refresh token не найден или невалиден, очищаем сессию
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            try {
              await supabase.auth.signOut()
            } catch (signOutError) {
              console.error('Ошибка при выходе:', signOutError)
            }
            setError('Сессия истекла. Пожалуйста, войдите снова.')
            setTimeout(() => router.push('/login'), 2000)
            return
          }
        }

        // Проверяем пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          console.error('User error:', userError)
          // Если это ошибка refresh token, очищаем сессию
          if (userError.message?.includes('Refresh Token') || userError.message?.includes('Invalid Refresh Token')) {
            try {
              await supabase.auth.signOut()
            } catch (signOutError) {
              console.error('Ошибка при выходе:', signOutError)
            }
            setError('Сессия истекла. Пожалуйста, войдите снова.')
          } else {
            setError(userError.message)
          }
          setTimeout(() => router.push('/login'), 2000)
          return
        }

        if (user) {
          // Небольшая задержка для стабилизации состояния
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 500)
        } else {
          setTimeout(() => router.push('/login'), 500)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Ошибка авторизации'
        if (isSupabaseNetworkError(err)) {
          setError('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
        } else if (message.includes('Refresh Token') || message.includes('Invalid Refresh Token')) {
          try {
            const supabase = createClient()
            await supabase.auth.signOut()
            setError('Сессия истекла. Пожалуйста, войдите снова.')
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError)
            setError(message)
          }
        } else {
          setError(message)
        }
        setTimeout(() => router.push('/login'), 2000)
      }
    }

    // Добавляем небольшую задержку для обработки callback
    const timer = setTimeout(() => {
      checkAuth()
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white pt-safe">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-sm text-zinc-400">Перенаправление на страницу входа...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white pt-safe">
      <p className="text-zinc-400">Загрузка...</p>
    </div>
  )
}

