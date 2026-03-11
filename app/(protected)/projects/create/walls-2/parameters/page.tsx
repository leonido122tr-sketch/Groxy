'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { BackIcon, DownloadIcon, FoundationIcon, RoofIcon, WallsIcon } from '@/app/components/AppIcons'
import { Capacitor } from '@capacitor/core'
import { getLocalProject, type LocalProject } from '@/lib/projects/localProjects'
import { listDeviceProjects } from '@/lib/projects/deviceProjects'
import { getFoundationRoofOverridesFromStorage, getWallsOverridesFromStorage } from '@/lib/projects/resultOverridesStorage'
import { BackButton } from '@/app/components/BackButton'

function getFoundationVolumeFromStorage(): number | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('currentProjectData_foundation_2')
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as { length?: number; width?: number; height?: number; thickness?: number; principle?: string }
    const length = Number(d.length ?? 0)
    const width = Number(d.width ?? 0)
    const height = Number(d.height ?? 0)
    const thickness = Number(d.thickness ?? 0)
    if (length <= 0 || width <= 0 || height <= 0 || thickness <= 0) return null
    const t = thickness
    const adj = d.principle === 'outside' ? -t / 2 : t / 2
    const adjustedWidth = Math.max(0, width + adj)
    const adjustedLength = Math.max(0, length + adj)
    const foundationLength = adjustedWidth + adjustedLength
    return foundationLength * t * height
  } catch {
    return null
  }
}

function getRoofAreaFromStorage(): number | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('currentProjectData_roof_2')
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as { width?: number; length?: number; height?: number; overhang?: number }
    const w = Number(d.width ?? 0)
    const len = Number(d.length ?? 0)
    const h = Number(d.height ?? 0)
    const o = Number(d.overhang ?? 0)
    if (w <= 0 || len <= 0) return null
    const slopeLength = Math.sqrt(w * w + h * h) + 2 * o
    const lengthDim = len + 2 * o
    return Math.round(slopeLength * lengthDim * 100) / 100
  } catch {
    return null
  }
}

const PARAMS_PAGE_PATH = '/projects/create/walls-2'

export default function ProjectSetupPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [projectName, setProjectName] = useState('')
  const [includePdfMeta, setIncludePdfMeta] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isProjectSaved, setIsProjectSaved] = useState(false)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)
  const [pdfComment, setPdfComment] = useState('')
  const [notes, setNotes] = useState('')
  const [cardRefresh, setCardRefresh] = useState(0)
  useEffect(() => {
    const onFocus = () => setCardRefresh((n) => n + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  // При возврате с фундамента/стен/крыши перечитываем ручные итоги из storage для карточек
  useEffect(() => {
    if (pathname === PARAMS_PAGE_PATH) {
      const t = setTimeout(() => setCardRefresh((n) => n + 1), 0)
      return () => clearTimeout(t)
    }
  }, [pathname])

  // Форматирование даты в формат ДД.ММ.ГГГГ
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  // Загружаем название проекта из sessionStorage при монтировании
  useEffect(() => {
    const savedName = sessionStorage.getItem('currentProjectName_walls_2')
    if (savedName) {
      setProjectName(savedName)
    }
    
    // Загружаем состояние includePdfMeta
    const savedIncludePdfMeta = sessionStorage.getItem('includePdfMeta_walls_2')
    if (savedIncludePdfMeta === 'true') {
      setIncludePdfMeta(true)
    }
    
    // Проверяем, сохранен ли проект или есть данные в sessionStorage
    const lastSavedProjectId = sessionStorage.getItem('lastSavedProjectId_walls_2')
    const savedData = sessionStorage.getItem('currentProjectData_walls_2')
    if (lastSavedProjectId || savedData) {
      setIsProjectSaved(true)
    }
    
    // Проверяем наличие сохраненного PDF URI
    const savedPdfUriFromStorage = sessionStorage.getItem('pdfViewerUri')
    if (savedPdfUriFromStorage) {
      setSavedPdfUri(savedPdfUriFromStorage)
    }
    const savedComment = sessionStorage.getItem('pdfComment_walls_2')
    if (savedComment != null) setPdfComment(savedComment)
    const savedNotes = sessionStorage.getItem('notes_walls_2')
    if (savedNotes != null) setNotes(savedNotes)
  }, [])

  const openPdf = () => {
    if (!savedPdfUri) return
    const savedFilename = sessionStorage.getItem('pdfViewerFilename') || 'document.pdf'
    router.push(`/pdf-viewer?uri=${encodeURIComponent(savedPdfUri)}&filename=${encodeURIComponent(savedFilename)}`)
  }

  const handleGeneratePdfLegacy = async () => {
    try {
      // Получаем данные проекта из sessionStorage или из сохраненного проекта
      type ProjectDataStub = { name?: string; material?: string; principle?: string; width: number; length: number; height: number; thickness: number; openings?: Array<{ width?: number; height?: number }>; note?: string }
      let projectData: ProjectDataStub | null = null
      const savedData = sessionStorage.getItem('currentProjectData_walls_2')
      if (savedData) {
        projectData = JSON.parse(savedData)
      } else {
        // Пробуем загрузить сохраненный проект
        const lastSavedProjectId = sessionStorage.getItem('lastSavedProjectId_walls_2')
        if (!lastSavedProjectId) {
          setToast('Сначала заполните параметры стен')
          setTimeout(() => setToast(null), 3000)
          return
        }
        
        let project: LocalProject | null = null
        if (Capacitor.isNativePlatform()) {
          const deviceProjects = await listDeviceProjects()
          project = deviceProjects.find(p => p.id === lastSavedProjectId && p.type === 'walls_2') || null
        } else {
          project = getLocalProject(lastSavedProjectId) as Extract<LocalProject, { type: 'walls_2' }> | null
        }
        
        if (project && project.type === 'walls_2') {
          projectData = {
            name: project.name,
            material: project.data.material,
            principle: project.data.principle,
            width: project.data.width,
            length: project.data.length,
            height: project.data.height,
            thickness: project.data.thickness,
            openings: project.data.openings,
            note: project.data.note,
          }
        } else {
          setToast('Проект не найден. Заполните параметры стен')
          setTimeout(() => setToast(null), 3000)
          return
        }
      }

      // Проверяем, что есть минимальные данные для создания PDF
      if (!projectData || projectData.width <= 0 || projectData.length <= 0 || projectData.height <= 0 || projectData.thickness <= 0) {
        setToast('Заполните все параметры стен для создания PDF')
        setTimeout(() => setToast(null), 3000)
        return
      }

      setToast('Создание PDF...')

      // Импортируем функцию генерации PDF с захватом большой визуализации
      const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
      
      // Вычисляем результаты
      const t = Math.max(0, projectData.thickness)
      const adj = projectData.principle === 'inside' ? t / 2 : -t / 2
      const l1 = Math.max(0, projectData.width + adj)
      const l2 = Math.max(0, projectData.length + adj)
      const openingsArea = (projectData.openings || []).reduce((sum: number, o: { width?: number; height?: number }) => sum + (o.width || 0) * (o.height || 0), 0)
      const areaWithOpenings = (l1 + l2) * projectData.height
      const wallArea = Math.max(0, areaWithOpenings - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const innerAdj = projectData.principle === 'inside' ? 0 : -t / 2
      const innerWidth = Math.max(0, projectData.width + innerAdj)
      const innerLength = Math.max(0, projectData.length + innerAdj)
      const area = Math.max(0, innerWidth * innerLength)

      const results = { area, volume }
      const dims = {
        width: projectData.width,
        length: projectData.length,
        height: projectData.height,
        thickness: projectData.thickness,
      }

      // Материал
      const MATERIALS: Record<string, string> = {
        'brick_m100': 'Кирпич (M100)',
        'brick_m150': 'Кирпич (M150)',
        'concrete_m200': 'Бетон (M200)',
        'concrete_m300': 'Бетон (M300)',
        'polystyrene_concrete_d400': 'Полистиролбетон (D400)',
        'polystyrene_concrete_d500': 'Полистиролбетон (D500)',
        'wood_pine': 'Дерево (Сосна)',
        'wood_larch': 'Дерево (Лиственница)',
      }
      const materialLabel = MATERIALS[projectData.material ?? ''] || 'Не выбран'
      const principleLabel = projectData.principle === 'inside' ? 'Внутри' : 'Снаружи'

      const foundationRaw = sessionStorage.getItem('currentProjectData_foundation_2')
      let foundation:
        | {
            length: number
            width: number
            height: number
            thickness: number
            principle: 'inside' | 'outside'
            concreteGrade?: string
          }
        | undefined
      if (foundationRaw) {
        try {
          const f = JSON.parse(foundationRaw)
          const fl = Number(f.length ?? 0)
          const fw = Number(f.width ?? 0)
          const fh = Number(f.height ?? 0)
          const ft = Number(f.thickness ?? 0)
          if (fl > 0 && fw > 0 && fh > 0 && ft > 0) {
            foundation = {
              length: fl,
              width: fw,
              height: fh,
              thickness: ft,
              principle: f.principle === 'inside' ? 'inside' : 'outside',
              concreteGrade: typeof f.concreteGrade === 'string' ? f.concreteGrade : undefined,
            }
          }
        } catch {
          // ignore
        }
      }

      const payload = {
        title: projectName.trim() || projectData.name || 'Проект строительства',
        includeMeta: includePdfMeta,
        materialLabel,
        principleLabel,
        dims,
        results,
        openings: (projectData.openings || []).map((o: { width?: number; height?: number; offset?: number; wall?: number }) => ({
          width: o.width ?? 0,
          height: o.height ?? 0,
          ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}),
          ...(o.wall != null ? { wall: o.wall as 1 | 2 } : {}),
        })),
        type: 'walls_2' as const,
        foundation,
        pdfComment: pdfComment.trim() || undefined,
      }
      const pdfBytes = await generatePdfWithPlanCapture('walls_2', payload)

      const dateStr = formatDate(new Date())
      const projectNameForPdf = (projectName.trim() || projectData.name || 'Проект')
      const filename = `${projectNameForPdf}_${dateStr}.pdf`

      // Конвертируем bytes в base64 для сохранения в sessionStorage
      function uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = ''
        const len = bytes.byteLength
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
      }
      
      const base64Data = uint8ArrayToBase64(pdfBytes)
      
      if (Capacitor.isNativePlatform()) {
        // На Android сохраняем PDF на устройство
        const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
        const result = await savePdfToDevice(filename, pdfBytes)
        if (!result) {
          throw new Error('Не удалось сохранить PDF')
        }
        
        const uri = typeof result === 'string' ? result : result.uri
        const filePath = typeof result === 'string' ? undefined : result.path
        
        sessionStorage.setItem('pdfViewerUri', uri)
        sessionStorage.setItem('pdfViewerFilename', filename)
        if (filePath) {
          sessionStorage.setItem('pdfViewerFilePath', filePath)
        }
        sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
        sessionStorage.setItem('pdfViewerPdfData', JSON.stringify({ 
          projectName: projectName.trim() || projectData.name || 'Проект строительства',
          projectType: 'walls_2',
          materialLabel,
          principleLabel
        }))
        
        setSavedPdfUri(uri)
        router.push(`/pdf-viewer?uri=${encodeURIComponent(uri)}&filename=${encodeURIComponent(filename)}`)
      } else {
        // Для веб-версии используем blob URL
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        
        sessionStorage.setItem('pdfViewerUri', url)
        sessionStorage.setItem('pdfViewerFilename', filename)
        sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
        sessionStorage.setItem('pdfViewerPdfData', JSON.stringify({ 
          projectName: projectName.trim() || projectData.name || 'Проект строительства',
          projectType: 'walls_2',
          materialLabel,
          principleLabel
        }))
        
        setSavedPdfUri(url)
        router.push(`/pdf-viewer?uri=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
      }
    } catch (error: unknown) {
      console.error('Ошибка при создании PDF:', error)
      setToast(error instanceof Error ? error.message : 'Не удалось создать PDF')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleContinue = (section: 'foundation' | 'walls' | 'roof') => {
    // Сохраняем название проекта в sessionStorage
    if (projectName.trim()) {
      sessionStorage.setItem('currentProjectName_walls_2', projectName.trim())
    }
    
    // Переходим в соответствующий раздел
    if (section === 'walls') {
      router.push('/projects/create/walls-2/walls')
    } else if (section === 'foundation') {
      router.push('/projects/create/walls-2/foundation')
    } else if (section === 'roof') {
      router.push('/projects/create/walls-2/roof')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f14] font-sans text-white pt-safe">
      <header className="border-b border-white/8 bg-[#10161f]">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <BackButton
              fallbackHref="/projects/create"
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#1a2230] px-3 py-2.5 text-sm font-medium text-white"
            >
              <BackIcon className="h-5 w-5" aria-label="Назад" />
            </BackButton>
            <h1 className="max-w-[70%] truncate text-xl font-semibold tracking-[-0.02em] text-white">Пристрой 2 стены</h1>
            <div className="h-12 w-12" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">Пристрой 2 стены</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">Введите название проекта и выберите раздел для работы</p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Название проекта</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Введите название проекта"
            className="android-field"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(() => {
            const fo = getFoundationRoofOverridesFromStorage('2')
            const wo = getWallsOverridesFromStorage('2')
            const foundationManual = fo.foundationVolume != null && Number.isFinite(fo.foundationVolume) ? fo.foundationVolume : null
            const foundationCalc = getFoundationVolumeFromStorage()
            const foundationValue = foundationManual ?? foundationCalc
            const roofManual = fo.roofArea != null && Number.isFinite(fo.roofArea) ? fo.roofArea : null
            const roofCalc = getRoofAreaFromStorage()
            const roofValue = roofManual ?? roofCalc
            return (
              <>
                <button
                  type="button"
                  onClick={() => handleContinue('foundation')}
                  className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
                >
                  <img src="/projects/create/foundation.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
                  <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <FoundationIcon className="h-6 w-6 shrink-0 text-white" />
                      <span className="text-base font-semibold text-white drop-shadow-sm">Фундамент</span>
                    </div>
                    {foundationValue != null && (
                      <span className="text-xs font-normal text-zinc-300">{Number(foundationValue).toFixed(2).replace('.', ',')} м³</span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleContinue('walls')}
                  className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
                >
                  <img src="/projects/create/walls.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
                  <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <WallsIcon className="h-6 w-6 shrink-0 text-white" />
                      <span className="text-base font-semibold text-white drop-shadow-sm">Стены</span>
                    </div>
                    {(wo.wallsArea != null || wo.wallsVolume != null) && (
                      <span className="text-center text-xs font-normal text-zinc-300">{(wo.wallsArea ?? 0).toFixed(2).replace('.', ',')} м² · {(wo.wallsVolume ?? 0).toFixed(2).replace('.', ',')} м³</span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleContinue('roof')}
                  className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
                >
                  <img src="/projects/create/roof.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
                  <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <RoofIcon className="h-6 w-6 shrink-0 text-white" />
                      <span className="text-base font-semibold text-white drop-shadow-sm">Крыша</span>
                    </div>
                    {roofValue != null && (
                      <span className="text-xs font-normal text-zinc-300">{Number(roofValue).toFixed(2).replace('.', ',')} м²</span>
                    )}
                  </div>
                </button>
              </>
            )
          })()}
        </div>

        <div className="android-panel mt-6 p-4">
          <h3 className="text-base font-semibold text-white">Дополнительно</h3>
          <p className="mt-1 text-xs text-zinc-400">Комментарий попадёт в PDF, заметки — только для себя</p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Комментарий в PDF</label>
              <textarea
                value={pdfComment}
                onChange={(e) => {
                  setPdfComment(e.target.value)
                  sessionStorage.setItem('pdfComment_walls_2', e.target.value)
                }}
                inputMode="text"
                autoComplete="off"
                placeholder="Например: учесть запас 5% на отходы..."
                className="android-field min-h-[88px] text-sm"
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Заметки (только для себя)</label>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  sessionStorage.setItem('notes_walls_2', e.target.value)
                }}
                inputMode="text"
                autoComplete="off"
                placeholder="Напоминания, контакты, даты..."
                className="android-field min-h-[88px] text-sm"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openPdf}
              disabled={!savedPdfUri}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl px-6 py-4 text-base font-semibold transition-colors sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-500"
            >
              <DownloadIcon className="h-5 w-5" />
              Открыть PDF
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={includePdfMeta}
                onChange={(e) => {
                  setIncludePdfMeta(e.target.checked)
                  sessionStorage.setItem('includePdfMeta_walls_2', String(e.target.checked))
                }}
                className="android-checkbox"
              />
              Подписать PDF
            </label>
          </div>
          {!savedPdfUri && (
            <p className="mt-2 text-center text-sm text-zinc-400">Сохраните PDF с помощью иконки в шапке раздела Фундамент, Стены или Крыша</p>
          )}
        </div>
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2">
          <div className="android-toast text-sm">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

