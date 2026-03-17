'use client'

import { useEffect } from 'react'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { LocalProjectsList } from '@/app/components/LocalProjectsList'
import { clearResultOverridesFromStorage } from '@/lib/projects/resultOverridesStorage'
import { PROJECTS_LIMIT } from '@/lib/projects/projectsLimit'

export default function MyProjectsPage() {
  useEffect(() => {
    clearResultOverridesFromStorage()
  }, [])

  return (
    <AppPage header={<AppHeader />} width="lg" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="p-5">
          <p className="text-sm text-zinc-400">Библиотека проектов</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-white">Мои проекты</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            Здесь хранятся ваши сохранённые проекты, PDF и результаты расчётов. Можно сохранить не более {PROJECTS_LIMIT} проектов.
          </p>
        </SurfaceCard>

        <LocalProjectsList />
      </div>
    </AppPage>
  )
}
