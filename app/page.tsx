'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { PageLoader } from '@/app/components/PageLoader'
import {
  ForwardIcon,
} from '@/app/components/AppIcons'
import { LandingHeader } from '@/app/components/AppHeader'
import {
  AppPage,
  HeroPanel,
  PrimaryActionLink,
  SecondaryActionLink,
  SurfaceCard,
} from '@/app/components/AppShell'
import { AUTH_CHECK_TIMEOUT_MS } from '@/lib/auth/constants'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), AUTH_CHECK_TIMEOUT_MS)
        )
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ])

        // Обрабатываем ошибку refresh token
        if (sessionError) {
          console.error('Ошибка проверки сессии:', sessionError)
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut()
          }
          setLoading(false)
          return
        }

        if (session) {
          router.push('/dashboard')
          return
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        if (isSupabaseNetworkError(error)) {
          console.warn('Нет связи с сервером авторизации, продолжаем без входа.')
        } else if (message.includes('конфигурация Supabase') || message.includes('NEXT_PUBLIC_SUPABASE')) {
          console.warn('Конфигурация Supabase не найдена, продолжаем без авторизации')
        } else if (message.includes('Refresh Token') || message.includes('Invalid Refresh Token')) {
          try {
            const supabase = createClient()
            await supabase.auth.signOut()
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError)
          }
        } else {
          console.error('Ошибка проверки сессии:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return <PageLoader />
  }

  return (
    <AppPage header={<LandingHeader />} width="md" className="py-6">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-[24px]">
          <img src="/landing/home-intro.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
          <div className="relative z-10 flex items-center gap-4 p-4">
            <div className="flex w-16 aspect-square items-center justify-center overflow-hidden rounded-full bg-[#1a2230]">
              <Image
                src="/logo.png"
                alt="Groxy"
                width={48}
                height={48}
                className="h-full w-full rounded-full object-cover"
                priority
              />
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                Groxy
              </p>
              <p className="text-sm text-zinc-300">
                Проекты, расчёты и база знаний по строительству
              </p>
            </div>
          </div>
        </div>

        <SurfaceCard className="relative min-h-[220px] overflow-hidden p-0">
          <img src="/landing/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
          <div className="relative z-10 p-5">
            <HeroPanel
              eyebrow="Платформа для стройки"
              title="Проектируйте, рассчитывайте и сохраняйте строительные решения в одном приложении."
              className="gap-4"
              actions={
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:w-auto sm:justify-center">
                  <PrimaryActionLink href="/login" className="w-full sm:w-auto">
                    Войти
                  </PrimaryActionLink>
                  <SecondaryActionLink href="/register" className="w-full sm:w-auto">
                    Регистрация
                  </SecondaryActionLink>
                </div>
              }
            />
          </div>
        </SurfaceCard>

        <Link href="/support" className="block rounded-[22px] active:scale-[0.995]">
          <SurfaceCard className="relative overflow-hidden p-0">
            <img src="/landing/support.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
            <div className="relative z-10 flex min-h-[88px] items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <span className="text-base font-medium text-white drop-shadow-sm">Поддержка и сотрудничество</span>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-300">Написать о проблемах и пожеланиях</p>
              </div>
              <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-400" />
            </div>
          </SurfaceCard>
        </Link>
      </div>
    </AppPage>
  )
}
