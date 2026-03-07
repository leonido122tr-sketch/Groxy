'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Building2, Box, Home } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { getLocalProject, type LocalProject } from '@/lib/projects/localProjects'
import { listDeviceProjects } from '@/lib/projects/deviceProjects'

interface ProjectData {
  name: string
  material: string
  principle: 'inside' | 'outside'
  width: number
  length: number
  height: number
  thickness: number
  openings?: Array<{ width: number; height: number }>
  note?: string
}

export default function ProjectSetupPage() {
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [includePdfMeta, setIncludePdfMeta] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isProjectSaved, setIsProjectSaved] = useState(false)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)

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
  }, [])

  const handleGeneratePdf = async () => {
    // Если PDF уже сохранен, просто открываем его
    if (savedPdfUri) {
      const savedFilename = sessionStorage.getItem('pdfViewerFilename') || 'document.pdf'
      router.push(`/pdf-viewer?uri=${encodeURIComponent(savedPdfUri)}&filename=${encodeURIComponent(savedFilename)}`)
      return
    }

    try {
      // Получаем данные проекта из sessionStorage или из сохраненного проекта
      let projectData: ProjectData | null = null
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

      // Импортируем функцию генерации PDF
      const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
      
      // Вычисляем результаты
      const t = Math.max(0, projectData.thickness)
      const adj = projectData.principle === 'inside' ? t / 2 : -t / 2
      const l1 = Math.max(0, projectData.width + adj)
      const l2 = Math.max(0, projectData.length + adj)
      const openingsArea = (projectData.openings || []).reduce((sum: number, o: { width: number, height: number }) => sum + (o.width || 0) * (o.height || 0), 0)
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
      const materialLabel = MATERIALS[projectData.material] || 'Не выбран'
      const principleLabel = projectData.principle === 'inside' ? 'Внутри' : 'Снаружи'

      const pdfBytes = await generatePdfClient({
        title: projectName.trim() || projectData.name || 'Проект строительства',
        includeMeta: includePdfMeta,
        materialLabel,
        principleLabel,
        dims,
        results,
        openings: (projectData.openings || []).map((o: { width: number, height: number }) => ({ width: o.width, height: o.height })),
        type: 'walls_2',
      })

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
      const message = error instanceof Error ? error.message : 'Не удалось создать PDF'
      setToast(message)
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
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/projects/create"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" aria-label="Назад" />
            </Link>
            <h1 className="text-2xl font-bold">Настройка проекта</h1>
            <div className="w-[88px]" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold leading-tight">Пристрой 2 стены</h2>
        <p className="mt-2 max-w-2xl text-zinc-400">Введите название проекта и выберите раздел для работы</p>

        <div className="mt-8">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Название проекта
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Введите название проекта"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => handleContinue('foundation')}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <Building2 className="h-10 w-10 text-white" />
            <span>Фундамент</span>
          </button>

          <button
            onClick={() => handleContinue('walls')}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <Box className="h-10 w-10 text-white" />
            <span>Стены</span>
          </button>

          <button
            onClick={() => handleContinue('roof')}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-6 py-8 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <Home className="h-10 w-10 text-white" />
            <span>Крыша</span>
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-500"
                checked={includePdfMeta}
                onChange={(e) => {
                  setIncludePdfMeta(e.target.checked)
                  sessionStorage.setItem('includePdfMeta_walls_2', String(e.target.checked))
                }}
              />
              Добавить в PDF пользователя и почту
            </label>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={!isProjectSaved}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
            >
              <Download className="h-5 w-5" />
              {savedPdfUri ? 'Открыть PDF' : 'Сохранить в PDF'}
            </button>
            {!isProjectSaved && (
              <p className="text-sm text-zinc-400 text-center">
                Сначала заполните параметры стен для создания PDF
              </p>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2">
          <div className="rounded-xl border border-white/10 bg-black/90 px-4 py-3 text-sm text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

