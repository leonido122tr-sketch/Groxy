'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BackIcon, DownloadIcon, FoundationIcon, RoofIcon, WallsIcon } from '@/app/components/AppIcons'
import { Capacitor } from '@capacitor/core'
import { getLocalProject, type LocalProject } from '@/lib/projects/localProjects'
import { listDeviceProjects } from '@/lib/projects/deviceProjects'
import { BackButton } from '@/app/components/BackButton'

export default function ProjectSetupPage() {
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [includePdfMeta, setIncludePdfMeta] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isProjectSaved, setIsProjectSaved] = useState(false)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)
  const [pdfComment, setPdfComment] = useState('')
  const [notes, setNotes] = useState('')

  // Форматирование даты в формат ДД.ММ.ГГГГ
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  // Загружаем название проекта из sessionStorage при монтировании
  useEffect(() => {
    const savedName = sessionStorage.getItem('currentProjectName_walls_4')
    if (savedName) {
      setProjectName(savedName)
    }
    
    // Загружаем состояние includePdfMeta
    const savedIncludePdfMeta = sessionStorage.getItem('includePdfMeta_walls_4')
    if (savedIncludePdfMeta === 'true') {
      setIncludePdfMeta(true)
    }
    
    // Проверяем, сохранен ли проект или есть данные в sessionStorage
    const lastSavedProjectId = sessionStorage.getItem('lastSavedProjectId_walls_4')
    const savedData = sessionStorage.getItem('currentProjectData_walls_4')
    if (lastSavedProjectId || savedData) {
      setIsProjectSaved(true)
    }
    
    // Проверяем наличие сохраненного PDF URI
    const savedPdfUriFromStorage = sessionStorage.getItem('pdfViewerUri')
    if (savedPdfUriFromStorage) {
      setSavedPdfUri(savedPdfUriFromStorage)
    }
    const savedComment = sessionStorage.getItem('pdfComment_walls_4')
    if (savedComment != null) setPdfComment(savedComment)
    const savedNotes = sessionStorage.getItem('notes_walls_4')
    if (savedNotes != null) setNotes(savedNotes)
  }, [])

  const handleGeneratePdf = async () => {
    // ВАЖНО: всегда пересоздаем PDF для гарантии открытия
    /* if (savedPdfUri) {
      const savedFilename = sessionStorage.getItem('pdfViewerFilename') || 'document.pdf'
      router.push(`/pdf-viewer?uri=${encodeURIComponent(savedPdfUri)}&filename=${encodeURIComponent(savedFilename)}`)
      return
    } */

    try {
      // Получаем данные проекта из sessionStorage
      type ProjectDataStub = { name?: string; material?: string; principle?: string; width: number; length: number; height: number; thickness: number; openings?: Array<{ width?: number; height?: number }>; note?: string }
      let projectData: ProjectDataStub | null = null
      const savedData = sessionStorage.getItem('currentProjectData_walls_4')
      if (savedData) {
        projectData = JSON.parse(savedData)
      } else {
        // Пробуем загрузить сохраненный проект
        const lastSavedProjectId = sessionStorage.getItem('lastSavedProjectId_walls_4')
        if (!lastSavedProjectId) {
          setToast('Сначала заполните параметры стен')
          setTimeout(() => setToast(null), 3000)
          return
        }
        
        let project: LocalProject | null = null
        if (Capacitor.isNativePlatform()) {
          const deviceProjects = await listDeviceProjects()
          project = deviceProjects.find(p => p.id === lastSavedProjectId && p.type === 'walls_4') || null
        } else {
          project = getLocalProject(lastSavedProjectId) as Extract<LocalProject, { type: 'walls_4' }> | null
        }
        
        if (project && project.type === 'walls_4') {
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

      // Импортируем функцию генерации PDF с захватом большой визуализации и данные фундамента/крыши из sessionStorage
      const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
      const { getWalls4PdfExtrasFromStorage } = await import('@/lib/pdf/getWalls4PdfExtras')
      const pdfExtras = getWalls4PdfExtrasFromStorage()

      // Вычисляем результаты для walls-4
      const t = Math.max(0, projectData.thickness)
      const sign = projectData.principle === 'inside' ? 1 : -1
      const wSide = Math.max(0, projectData.width + sign * t)
      const lSide = Math.max(0, projectData.length + sign * t)
      const perimeter = 2 * (wSide + lSide)
      const openingsArea = (projectData.openings || []).reduce((sum: number, o: { width?: number; height?: number }) => sum + (o.width || 0) * (o.height || 0), 0)
      const wallArea = Math.max(0, perimeter * projectData.height - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const areaInside = projectData.principle === 'inside'
        ? Math.max(0, projectData.width * projectData.length)
        : Math.max(0, Math.max(0, projectData.width - 2 * t) * Math.max(0, projectData.length - 2 * t))

      const results = { area: areaInside, volume }
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
          ...(o.wall != null ? { wall: o.wall as 1 | 2 | 3 | 4 } : {}),
        })),
        type: 'walls_4' as const,
        ...(pdfExtras.foundation ? { foundation: pdfExtras.foundation } : {}),
        ...(pdfExtras.roof ? { roof: pdfExtras.roof } : {}),
        pdfComment: pdfComment.trim() || undefined,
      }
      const pdfBytes = await generatePdfWithPlanCapture('walls_4', payload)

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
          projectType: 'walls_4',
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
          projectType: 'walls_4',
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
      sessionStorage.setItem('currentProjectName_walls_4', projectName.trim())
    }
    
    // Переходим в соответствующий раздел
    if (section === 'walls') {
      router.push('/projects/create/walls-4/walls')
    } else if (section === 'foundation') {
      router.push('/projects/create/walls-4/foundation')
    } else if (section === 'roof') {
      router.push('/projects/create/walls-4/roof')
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
            <h1 className="max-w-[70%] truncate text-xl font-semibold tracking-[-0.02em] text-white">Отдельная постройка 4 стены</h1>
            <div className="h-12 w-12" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">Отдельная постройка 4 стены</h2>
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
            </div>
          </button>
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
                  sessionStorage.setItem('pdfComment_walls_4', e.target.value)
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
                  sessionStorage.setItem('notes_walls_4', e.target.value)
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
              onClick={handleGeneratePdf}
              disabled={!isProjectSaved}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl px-6 py-4 text-base font-semibold transition-colors sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-500"
            >
              <DownloadIcon className="h-5 w-5" />
              {savedPdfUri ? 'Открыть PDF' : 'Сохранить в PDF'}
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={includePdfMeta}
                onChange={(e) => {
                  setIncludePdfMeta(e.target.checked)
                  sessionStorage.setItem('includePdfMeta_walls_4', String(e.target.checked))
                }}
                className="android-checkbox"
              />
              Подписать PDF
            </label>
          </div>
          {!isProjectSaved && (
            <p className="mt-2 text-center text-sm text-zinc-400">Сначала заполните параметры стен для создания PDF</p>
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
