'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LogoutButton } from '../components/LogoutButton'
import { LocalProjectsList } from '@/app/components/LocalProjectsList'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        
        // Сначала проверяем сессию
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Обрабатываем ошибку refresh token при проверке сессии
        if (sessionError) {
          console.error('Session error:', sessionError)
          // Если refresh token не найден или невалиден, очищаем сессию и выходим
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            try {
              await supabase.auth.signOut()
            } catch (signOutError) {
              console.error('Ошибка при выходе:', signOutError)
            }
          }
          setLoading(false)
          router.push('/login')
          return
        }
        
        // Затем проверяем пользователя
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
          }
          setLoading(false)
          router.push('/login')
          return
        }

        setUser(user)
        setLoading(false)
        
        if (!user) {
          router.push('/login')
        }
      } catch (err: any) {
        console.error('Auth check error:', err)
        // Если это ошибка refresh token, очищаем сессию
        if (err?.message?.includes('Refresh Token') || err?.message?.includes('Invalid Refresh Token')) {
          try {
            const supabase = createClient()
            await supabase.auth.signOut()
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError)
          }
        }
        setLoading(false)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white pt-safe">
        <p className="text-zinc-400">Загрузка...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white pt-safe">
        <p className="text-zinc-400">Перенаправление...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Groxy Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
              <h1 className="text-2xl font-bold text-white">
                Groxy
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/profile/setup"
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
              >
                Профиль
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-3xl font-bold text-white">Мои проекты</h2>
          <p className="mt-2 text-zinc-400">
            Создавайте, сохраняйте и делитесь своими проектами
          </p>

          <div className="mt-6">
            <Link
              href="/projects/create"
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-4 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95"
            >
              <span className="text-2xl leading-none">+</span>
              Создать новый проект
            </Link>
          </div>

          <LocalProjectsList />
        </div>
      </main>
    </div>
  )
}

