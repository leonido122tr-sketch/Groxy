'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getLocalProject } from '@/lib/projects/localProjects'
import { Capacitor } from '@capacitor/core'
import { listDeviceProjects } from '@/lib/projects/deviceProjects'
import WallsCalculator from '../create/walls/WallsCalculator'
import Walls3Calculator from '../create/walls-3/walls3Calculator'
import Walls4Calculator from '../create/walls-4/walls4Calculator'

function ProjectViewContent() {
  const sp = useSearchParams()
  const id = sp.get('id') ?? ''

  const [project, setProject] = useState<ReturnType<typeof getLocalProject> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!id) return
      setLoading(true)
      try {
        const local = getLocalProject(id)
        if (local) {
          if (!cancelled) setProject(local)
          return
        }

        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          const dev = await listDeviceProjects()
          const found = dev.find((p) => p.id === id) ?? null
          if (!cancelled) setProject(found)
          return
        }

        if (!cancelled) setProject(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Нет ID проекта</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              ← Назад
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold">Проект не найден</h1>
          <p className="mt-2 text-zinc-400">Этот проект не найден в локальном хранилище на этом устройстве.</p>
        </main>
      </div>
    )
  }

  if (project.type === 'walls_3') {
    return <Walls3Calculator mode="edit" projectId={project.id} initialProject={project} />
  }
  if (project.type === 'walls_4') {
    return <Walls4Calculator mode="edit" projectId={project.id} initialProject={project} />
  }

  return <WallsCalculator mode="edit" projectId={project.id} initialProject={project} />
}

export default function ProjectViewPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Загрузка...</p>
      </div>
    }>
      <ProjectViewContent />
    </Suspense>
  )
}


