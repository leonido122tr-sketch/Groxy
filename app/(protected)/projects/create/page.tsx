'use client'

import { useRouter } from 'next/navigation'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ForwardIcon } from '@/app/components/AppIcons'
import { clearResultOverridesForVariant } from '@/lib/projects/resultOverridesStorage'

const PROJECT_TYPE_ITEMS: {
  type: 'walls_2' | 'walls_3' | 'walls_4'
  title: string
  description: string
  imageUrl: string
}[] = [
  {
    type: 'walls_2',
    title: 'Пристрой 2 стены',
    description: 'Для пристройки с двумя внешними стенами.',
    imageUrl: '/projects/create/walls-2.jpg',
  },
  {
    type: 'walls_3',
    title: 'Пристрой 3 стены',
    description: 'Для пристройки с тремя внешними стенами.',
    imageUrl: '/projects/create/walls-3.jpg',
  },
  {
    type: 'walls_4',
    title: 'Отдельная постройка 4 стены',
    description: 'Для отдельно стоящей постройки с четырьмя стенами.',
    imageUrl: '/projects/create/walls-4.jpg',
  },
]

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
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-zinc-400">Новый проект</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-white">
            Выберите тип постройки
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            Сначала выберите конфигурацию стен, затем приложение проведёт по этапам расчёта.
          </p>
        </div>

        <div className="space-y-3">
          {PROJECT_TYPE_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                clearDraftForType(item.type)
                router.push(`/projects/create/walls-${item.type === 'walls_2' ? '2' : item.type === 'walls_3' ? '3' : '4'}`)
              }}
              className="w-full rounded-[22px] text-left active:scale-[0.995]"
            >
              <SurfaceCard className="relative overflow-hidden p-0">
                <img
                  src={item.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-50"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50"
                  aria-hidden
                />
                <div className="relative z-10 flex min-h-[88px] items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-base font-medium text-white drop-shadow-sm">{item.title}</span>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-300">{item.description}</p>
                  </div>
                  <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                </div>
              </SurfaceCard>
            </button>
          ))}
        </div>

        <SurfaceCard className="p-4">
          <p className="text-sm font-medium text-white">Что дальше</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            После выбора типа проекта вы последовательно заполните фундамент, стены и крышу, а затем сможете сохранить результат в PDF.
          </p>
        </SurfaceCard>
      </div>
    </AppPage>
  )
}


