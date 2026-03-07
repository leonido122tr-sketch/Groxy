'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/app/components/AppHeader'
import { clearResultOverridesForVariant } from '@/lib/projects/resultOverridesStorage'

export default function CreateProjectPage() {
  const router = useRouter()

  const clearDraftForType = (type: 'walls_2' | 'walls_3' | 'walls_4') => {
    if (typeof window === 'undefined') return
    const n = type === 'walls_2' ? '2' : type === 'walls_3' ? '3' : '4'
    clearResultOverridesForVariant(n)
    const suffix = `_walls_${n}`
    sessionStorage.removeItem(`currentProjectName${suffix}`)
    sessionStorage.removeItem(`currentProjectData${suffix}`)
    sessionStorage.removeItem(`currentProjectData_foundation_${n}`)
    sessionStorage.removeItem(`currentProjectData_roof_${n}`)
    sessionStorage.removeItem(`includePdfMeta${suffix}`)
    sessionStorage.removeItem(`pdfComment${suffix}`)
    sessionStorage.removeItem(`notes${suffix}`)
    sessionStorage.removeItem(`lastSavedProjectId${suffix}`)
    sessionStorage.removeItem('projectIsDirty')
    sessionStorage.removeItem('pdfViewerUri')
    sessionStorage.removeItem('pdfViewerFilename')
    sessionStorage.removeItem('pdfViewerPdfBytes')
    sessionStorage.removeItem('pdfViewerPdfData')
    sessionStorage.removeItem('pdfViewerFilePath')
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl"></div>
      </div>

      <AppHeader />
      <div className="relative z-10 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/15"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Назад</span>
            </Link>
            <h1 className="text-xl font-bold sm:text-2xl">Создать проект</h1>
            <div className="w-[88px] sm:w-[104px]" />
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            Планирование строительства
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Выберите тип проекта для расчета строительных материалов
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              clearDraftForType('walls_2')
              router.push('/projects/create/walls-2')
            }}
            className="btn-hover group glass-strong flex w-full items-center gap-4 rounded-2xl p-5 text-left transition-all hover:bg-white/15 hover:shadow-2xl"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                Пристрой 2 стены
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Расчет для пристройки с двумя внешними стенами
              </p>
            </div>
            <svg className="h-6 w-6 flex-shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              clearDraftForType('walls_3')
              router.push('/projects/create/walls-3')
            }}
            className="btn-hover group glass-strong flex w-full items-center gap-4 rounded-2xl p-5 text-left transition-all hover:bg-white/15 hover:shadow-2xl"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                Пристрой 3 стены
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Расчет для пристройки с тремя внешними стенами
              </p>
            </div>
            <svg className="h-6 w-6 flex-shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              clearDraftForType('walls_4')
              router.push('/projects/create/walls-4')
            }}
            className="btn-hover group glass-strong flex w-full items-center gap-4 rounded-2xl p-5 text-left transition-all hover:bg-white/15 hover:shadow-2xl"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white group-hover:text-pink-400 transition-colors">
                Отдельная постройка 4 стены
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Расчет для отдельно стоящей постройки с четырьмя стенами
              </p>
            </div>
            <svg className="h-6 w-6 flex-shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-white/15 glass p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-white">Быстрый старт</p>
          <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
            Выберите тип проекта выше и начните вводить параметры для автоматического расчета материалов и объемов
          </p>
        </div>
      </main>
    </div>
  )
}


