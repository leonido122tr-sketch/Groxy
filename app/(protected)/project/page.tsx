'use client'

import { useEffect } from 'react'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { LocalProjectsList } from '@/app/components/LocalProjectsList'
import { clearResultOverridesFromStorage } from '@/lib/projects/resultOverridesStorage'
export default function MyProjectsPage() {
  useEffect(() => {
    clearResultOverridesFromStorage()
  }, [])

  return (
    <AppPage header={<AppHeader />} width="lg" className="py-5">
      <div className="space-y-4">
        <div className="mx-auto max-w-2xl">
          <SurfaceCard className="relative overflow-hidden p-0">
            <img src="/dashboard/my-projects-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
            <div className="relative z-10 px-4 py-2.5">
              <p className="text-sm text-zinc-400">Библиотека проектов</p>
              <h2 className="mt-0.5 text-2xl font-semibold tracking-[-0.02em] text-white">Мои проекты</h2>
              <p className="mt-0.5 text-sm leading-5 text-zinc-300">
                Здесь хранятся ваши сохранённые проекты, PDF и результаты расчётов.
              </p>
            </div>
          </SurfaceCard>
        </div>

        <LocalProjectsList />
      </div>
    </AppPage>
  )
}
