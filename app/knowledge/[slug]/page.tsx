'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import type { User } from '@supabase/supabase-js'

const KNOWLEDGE_PAGES: Record<string, { title: string; description: string }> = {
  concrete: { title: 'Бетон', description: 'Марки, классы прочности, применение, расчёт количества' },
  metal: { title: 'Металл', description: 'Металлопрокат, арматура, крепёж, антикоррозия' },
  wood: { title: 'Дерево', description: 'Пиломатериалы, брус, доска, защита и обработка' },
  glass: { title: 'Стекло', description: 'Виды остекления, стеклопакеты, безопасность' },
  insulation: { title: 'Материалы для утепления', description: 'Теплоизоляция стен, кровли, пола, паропроницаемость' },
  brick: { title: 'Кирпич и кладочные материалы', description: 'Керамика, блоки, растворы, кладка' },
  roof: { title: 'Кровля и гидроизоляция', description: 'Покрытия, плёнки, мембраны, узлы примыканий' },
  foundation: { title: 'Фундаменты', description: 'Типы фундаментов, бетон, арматура, гидроизоляция' },
  finishing: { title: 'Отделочные материалы', description: 'Штукатурки, шпаклёвки, гипсокартон, плитка' },
  paint: { title: 'Лакокрасочные материалы', description: 'Краски, грунты, пропитки по типам оснований' },
  fasteners: { title: 'Крепёж и метизы', description: 'Анкеры, дюбели, саморезы под разные материалы' },
  standards: { title: 'Нормы и СНиПы', description: 'Тепловая защита, несущие конструкции, пожарная безопасность' },
}

export default function KnowledgeTopicPage() {
  const router = useRouter()
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const page = slug ? KNOWLEDGE_PAGES[slug] : null

  useEffect(() => {
    const AUTH_CHECK_TIMEOUT_MS = 8000
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      setLoading(false)
      router.push('/login')
    }, AUTH_CHECK_TIMEOUT_MS)

    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.getSession()
        if (timedOut) return
        if (sessionError) {
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            try { await supabase.auth.signOut() } catch { /* noop */ }
          }
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (timedOut) return
        if (userError) {
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }
        clearTimeout(timeoutId)
        setUser(user)
        setLoading(false)
        if (!user) router.push('/login')
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        if (isSupabaseNetworkError(err)) {
          console.warn('Нет связи с сервером авторизации.')
        } else {
          console.error('Auth check error:', err)
        }
        setLoading(false)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  if (loading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />
  if (!page) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
        <AppHeader />
        <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6 sm:px-6 lg:px-8">
          <p className="text-zinc-400">Раздел не найден.</p>
          <Link href="/knowledge" className="mt-4 inline-block text-sm text-white/80 underline hover:text-white">
            В базу знаний
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-6 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white">{page.title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{page.description}</p>

        <Link href="/knowledge" className="mt-6 inline-block text-sm text-white/80 underline hover:text-white">
          Назад в базу знаний
        </Link>
      </main>
    </div>
  )
}
