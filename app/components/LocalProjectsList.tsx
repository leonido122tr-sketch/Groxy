'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ConfirmModal } from '@/app/components/Modal'
import { Alert } from '@/app/components/Alert'
import {
  AndroidIcon,
  DeleteIcon,
  IconBadge,
  PdfIcon,
  ProjectsIcon,
  WebIcon,
} from '@/app/components/AppIcons'
import { type LocalProject, listLocalProjects, deleteLocalProject, upsertLocalProject } from '@/lib/projects/localProjects'
import { deleteDeviceProject, listDeviceProjects, saveProjectToDevice } from '@/lib/projects/deviceProjects'
import { Capacitor } from '@capacitor/core'
import { PdfViewer } from './PdfViewer'

function projectTypeLabel(p: LocalProject) {
  switch (p.type) {
    case 'walls_2':
      return 'Пристрой 2 стены'
    case 'walls_3':
      return 'Пристрой 3 стены'
    case 'walls_4':
      return 'Отдельная постройка 4 стены'
  }
}

function calculateResults(project: LocalProject) {
  let area = 0
  let volume = 0

  if (project.type === 'walls_2') {
    const data = project.data
    const width = data.width || 0
    const length = data.length || 0
    const height = data.height || 0
    const thickness = data.thickness || 0
    const openings = data.openings || []
    const openingArea = openings.reduce((sum, o) => sum + (o.width * o.height), 0)
    area = 2 * (width + length) * height - openingArea
    volume = area * thickness
  } else if (project.type === 'walls_3') {
    const data = project.data
    const left = data.left || 0
    const back = data.back || 0
    const right = data.right || 0
    const height = data.height || 0
    const thickness = data.thickness || 0
    const openings = data.openings || []
    const openingArea = openings.reduce((sum, o) => sum + (o.width * o.height), 0)
    area = (left + back + right) * height - openingArea
    volume = area * thickness
  } else if (project.type === 'walls_4') {
    const data = project.data
    const width = data.width || 0
    const length = data.length || 0
    const height = data.height || 0
    const thickness = data.thickness || 0
    const openings = data.openings || []
    const openingArea = openings.reduce((sum, o) => sum + (o.width * o.height), 0)
    area = 2 * (width + length) * height - openingArea
    volume = area * thickness
  }

  return { area, volume }
}

/** Объём фундамента по данным проекта (как в PDF). Учитывает ручной переопределение из resultsOverrides. */
function getFoundationVolume(project: LocalProject): number | null {
  const override = project.resultsOverrides?.foundationVolume
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return Math.round(override * 100) / 100
  }
  const f = project.foundation
  if (!f || typeof f !== 'object') return null
  const t = Number((f as { thickness?: number }).thickness ?? 0)
  const h = Number((f as { height?: number }).height ?? 0)
  if (!(t > 0 && h > 0)) return null
  const principle = (f as { principle?: string }).principle === 'inside' ? 'inside' : 'outside'
  const adj = principle === 'inside' ? t / 2 : -t / 2
  let length = 0
  if ('width' in f && 'length' in f) {
    const w = Math.max(0, Number(f.width) + adj)
    const l = Math.max(0, Number(f.length) + adj)
    length = w + l
  } else if ('left' in f && 'back' in f && 'right' in f) {
    length = Math.max(0, Number(f.left) + adj) + Math.max(0, Number(f.back) + adj) + Math.max(0, Number(f.right) + adj)
  }
  if (length <= 0) return null
  return Math.round(length * t * h * 100) / 100
}

/** Площадь крыши по данным проекта. Учитывает ручной переопределение из resultsOverrides. */
function getRoofArea(project: LocalProject): number | null {
  const override = project.resultsOverrides?.roofArea
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return Math.round(override * 100) / 100
  }
  const r = project.roof
  if (!r || typeof r !== 'object') return null
  const area = Number((r as { area?: number }).area ?? 0)
  return area > 0 ? Math.round(area * 100) / 100 : null
}

/** Есть ли у проекта заполненные размеры стен (хотя бы один > 0). */
function hasWallDims(project: LocalProject): boolean {
  const d = project.data
  if (project.type === 'walls_2' || project.type === 'walls_4') {
    const data = d as { width?: number; length?: number; height?: number; thickness?: number }
    return (Number(data?.width) > 0 || Number(data?.length) > 0 || Number(data?.height) > 0 || Number(data?.thickness) > 0)
  }
  const data = d as { left?: number; back?: number; right?: number; height?: number; thickness?: number }
  return (Number(data?.left) > 0 || Number(data?.back) > 0 || Number(data?.right) > 0 || Number(data?.height) > 0 || Number(data?.thickness) > 0)
}

function getMaterialLabel(material: string): string {
  const materials: Record<string, string> = {
    'brick_m100': 'Кирпич (M100)',
    'brick_m150': 'Кирпич (M150)',
    'concrete_m200': 'Бетон (M200)',
    'concrete_m300': 'Бетон (M300)',
    'polystyrene_concrete_d400': 'Полистиролбетон (D400)',
    'polystyrene_concrete_d500': 'Полистиролбетон (D500)',
    'wood_pine': 'Дерево (Сосна)',
    'wood_larch': 'Дерево (Лиственница)',
  }
  return materials[material] || 'Не выбран'
}

const PROJECTS_LIST_PATHS = ['/project', '/dashboard']

export function LocalProjectsList() {
  const router = useRouter()
  const pathname = usePathname()
  const [allProjects, setAllProjects] = useState<LocalProject[]>([])
  // const [deviceAvailable, setDeviceAvailable] = useState(false) // Removed unused state
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteModalProject, setDeleteModalProject] = useState<LocalProject | null>(null)
  const [pdfViewerData, setPdfViewerData] = useState<{ pdfData?: string; pdfUrl?: string; filename: string } | null>(null)

  const reload = async () => {
    const projects: LocalProject[] = []
    
    // Загружаем проекты из localStorage (работает и в веб, и в Capacitor WebView)
    try {
      const localProjects = listLocalProjects()
      projects.push(...localProjects.map(p => ({ ...p, platform: p.platform || 'web' as const })))
      
      // ВАЖНО: на Android НЕ выполняем фоновую синхронизацию проектов на устройство.
      // Проекты должны сохраняться только по явному действию пользователя.
    } catch (e) {
      // localStorage недоступен (например, в SSR)
      console.log('localStorage недоступен:', e)
    }
    
    // Загружаем проекты из памяти устройства (только на Android) с таймаутом
    try {
      const deviceProjectsPromise = listDeviceProjects()
      const timeoutPromise = new Promise<LocalProject[]>((resolve) => 
        setTimeout(() => resolve([]), 3000) // Таймаут 3 секунды
      )
      
      const deviceProjects = await Promise.race([deviceProjectsPromise, timeoutPromise])
      projects.push(...deviceProjects.map(p => ({ ...p, platform: p.platform || 'android' as const })))
      // setDeviceAvailable(true) // Removed unused state update
      setDeviceError(null)
    } catch (e: unknown) {
      // setDeviceAvailable(false) // Removed unused state update
      const message = e instanceof Error ? e.message : 'Не удалось прочитать память устройства'
      setDeviceError(message)
    }
    
    // Убираем дубликаты по ID, оставляя более свежую версию
    const uniqueProjects = new Map<string, LocalProject>()
    for (const p of projects) {
      const existing = uniqueProjects.get(p.id)
      if (!existing || new Date(p.updatedAt) > new Date(existing.updatedAt)) {
        uniqueProjects.set(p.id, p)
      }
    }

    const sorted = Array.from(uniqueProjects.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    setAllProjects(sorted)
    return sorted
  }

  useEffect(() => {
    reload()
    
    // Слушаем событие для открытия PDF viewer
    const handleOpenPdfViewer = async (event: CustomEvent) => {
      const { pdfData, pdfUrl, filename, uri } = event.detail
      console.log('Событие openPdfViewer получено:', { hasPdfData: !!pdfData, hasPdfUrl: !!pdfUrl, filename, hasUri: !!uri })
      
      setPdfViewerData({ pdfData, pdfUrl, filename })
    }
    const openPdfListener: EventListener = (evt) => void handleOpenPdfViewer(evt as CustomEvent)
    window.addEventListener('openPdfViewer', openPdfListener)

    // Перезагружаем список при возвращении в приложение/вкладку и при изменениях проектов
    const handleProjectsChanged = () => {
      void reload()
    }
    const handleFocus = () => {
      void reload()
    }
    window.addEventListener('groxy:projects-changed', handleProjectsChanged as EventListener)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('openPdfViewer', openPdfListener)
      window.removeEventListener('groxy:projects-changed', handleProjectsChanged)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Обновляем список при возврате на страницу «Мои проекты», чтобы с карточки открывался актуальный PDF
  useEffect(() => {
    if (pathname && PROJECTS_LIST_PATHS.includes(pathname)) {
      void reload()
    }
  }, [pathname])

  /** По нажатию «PDF» с карточки: всегда открываем из папки Groxy/pdfs, если файл есть; иначе генерируем и сохраняем */
  const openPdfFromCard = async (project: LocalProject) => {
    if (loading) return
    setLoading(project.id)
    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const { getSavedPdfUri } = await import('@/lib/pdf/pdfStorage')
        const filename = project.pdfFilename || `${project.id}.pdf`
        const saved = getSavedPdfUri(filename)
        if (saved) {
          sessionStorage.setItem('pdfViewerUri', saved.uri)
          sessionStorage.setItem('pdfViewerFilename', filename)
          sessionStorage.setItem('pdfViewerFilePath', saved.path)
          sessionStorage.setItem('pdfViewerReturnTo', '/project')
          router.push(`/pdf-viewer?uri=${encodeURIComponent(saved.uri)}&filename=${encodeURIComponent(filename)}&returnTo=${encodeURIComponent('/project')}`)
          return
        }
      }
      const freshList = await reload()
      const fresh = freshList.find((x) => x.id === project.id) ?? project
      await generatePdf(fresh)
    } finally {
      setLoading(null)
    }
  }

  const generatePdf = async (project: LocalProject) => {
    if (loading) return
    setLoading(project.id)

    try {
      const results = calculateResults(project)
      const materialLabel = getMaterialLabel(project.data.material || '')
      const principleLabel = project.data.principle === 'inside' ? 'Внутри' : 'Снаружи'

      const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
      const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')

      const pdfData: Record<string, unknown> = {
        title: project.name,
        includeMeta: false,
        materialLabel,
        principleLabel,
        dims: {},
        results,
        openings: (project.data.openings || []).map((o: { width: number; height: number; offset?: number; wall?: number }) => ({
          width: o.width,
          height: o.height,
          ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}),
          ...(o.wall != null ? { wall: o.wall } : {}),
        })),
        type: project.type,
      }

      if (project.type === 'walls_2') {
        const data = project.data
        pdfData.dims = {
          width: data.width,
          length: data.length,
          height: data.height,
          thickness: data.thickness,
        }
      } else if (project.type === 'walls_3') {
        const data = project.data
        pdfData.dims = {
          left: data.left,
          back: data.back,
          right: data.right,
          height: data.height,
          thickness: data.thickness,
        }
      } else if (project.type === 'walls_4') {
        const data = project.data
        pdfData.dims = {
          width: data.width,
          length: data.length,
          height: data.height,
          thickness: data.thickness,
        }
      }

      if (project.foundation && typeof project.foundation === 'object' && Object.keys(project.foundation).length > 0) {
        pdfData.foundation = project.foundation
      }
      if (project.roof && typeof project.roof === 'object' && Object.keys(project.roof).length > 0) {
        pdfData.roof = project.roof
      }
      if (project.pdfComment != null && String(project.pdfComment).trim() !== '') {
        pdfData.pdfComment = project.pdfComment
      }
      if (project.resultsOverrides && typeof project.resultsOverrides === 'object' && Object.keys(project.resultsOverrides).length > 0) {
        pdfData.resultsOverrides = project.resultsOverrides
      }

      const bytes =
        (project.type === 'walls_2' || project.type === 'walls_3' || project.type === 'walls_4')
          ? await generatePdfWithPlanCapture(project.type, pdfData as Parameters<typeof generatePdfWithPlanCapture>[1])
          : await generatePdfClient(pdfData as Parameters<typeof generatePdfClient>[0])
      const uint8ArrayToBase64 = (data: Uint8Array): string => {
        let binary = ''
        for (let i = 0; i < data.byteLength; i++) {
          binary += String.fromCharCode(data[i])
        }
        return btoa(binary)
      }
      const base64Data = uint8ArrayToBase64(bytes)

      if (Capacitor.isNativePlatform()) {
        const filename = `${project.id}.pdf`
        const { savePdfToDevice, getSavedPdfUri } = await import('@/lib/pdf/pdfStorage')
        const existing = getSavedPdfUri(filename)
        if (existing) {
          const overwrite = window.confirm('Существующий PDF будет перезаписан. Продолжить?')
          if (!overwrite) {
            sessionStorage.setItem('pdfViewerUri', existing.uri)
            sessionStorage.setItem('pdfViewerFilename', filename)
            sessionStorage.setItem('pdfViewerFilePath', existing.path)
            sessionStorage.setItem('pdfViewerReturnTo', '/project')
            router.push(`/pdf-viewer?uri=${encodeURIComponent(existing.uri)}&filename=${encodeURIComponent(filename)}&returnTo=${encodeURIComponent('/project')}`)
            return
          }
        }
        console.log('[LocalProjectsList.generatePdf] Сохранение PDF на Android...')
        const result = await savePdfToDevice(filename, bytes)
        if (!result) {
          console.error('[LocalProjectsList.generatePdf] Не удалось сохранить PDF на устройство')
          throw new Error('Не удалось сохранить PDF')
        }
        const saved = getSavedPdfUri(filename)
        const uri = saved?.uri ?? (typeof result === 'string' ? result : result.uri)
        const filePath = saved?.path ?? (typeof result === 'string' ? undefined : result.path)
        const updatedProject = { ...project, updatedAt: new Date().toISOString(), pdfFilename: filename }
        ;(window as unknown as { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
        try {
          const { saveProjectToDevice } = await import('@/lib/projects/deviceProjects')
          await saveProjectToDevice(updatedProject)
        } finally {
          ;(window as unknown as { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
        }
        sessionStorage.setItem('pdfViewerUri', uri)
        sessionStorage.setItem('pdfViewerFilename', filename)
        sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
        sessionStorage.setItem('pdfViewerReturnTo', '/project')
        if (filePath) sessionStorage.setItem('pdfViewerFilePath', filePath)
        router.push(`/pdf-viewer?uri=${encodeURIComponent(uri)}&filename=${encodeURIComponent(filename)}&returnTo=${encodeURIComponent('/project')}`)
        return
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${project.name.trim() || 'Проект_строительства'}_${stamp}.pdf`

      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      sessionStorage.setItem('pdfViewerUri', url)
      sessionStorage.setItem('pdfViewerFilename', filename)
      sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
      sessionStorage.setItem('pdfViewerReturnTo', '/project')
      router.push(`/pdf-viewer?uri=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&returnTo=${encodeURIComponent('/project')}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось создать PDF'
      alert(message)
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteClick = (project: LocalProject) => {
    setDeleteModalProject(project)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModalProject) return

    const project = deleteModalProject
    setDeleteModalProject(null)

    try {
      if (project.platform === 'android') {
        await deleteDeviceProject(project.id)
      } else {
        deleteLocalProject(project.id)
      }
      await reload()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить проект'
      alert(message)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalProject(null)
  }

  if (allProjects.length === 0) {
    return (
      <>
        {pdfViewerData && !(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') && (
          <PdfViewer
            pdfData={pdfViewerData.pdfData}
            pdfUrl={pdfViewerData.pdfUrl}
            filename={pdfViewerData.filename}
            onClose={() => setPdfViewerData(null)}
          />
        )}
        <div className="rounded-[24px] bg-[#141a22] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <IconBadge tone="neutral" size="lg" className="mx-auto mb-3">
            <ProjectsIcon className="h-8 w-8 text-zinc-300" />
          </IconBadge>
          <p className="text-base font-semibold text-white">Проектов пока нет</p>
          <p className="mt-1 text-sm text-zinc-300">Создайте первый проект, чтобы начать работу в Groxy.</p>
        </div>
      </>
    )
  }

  return (
    <>
      {pdfViewerData && (
        <PdfViewer
          pdfData={pdfViewerData.pdfData}
          pdfUrl={pdfViewerData.pdfUrl}
          filename={pdfViewerData.filename}
          onClose={() => setPdfViewerData(null)}
        />
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Все проекты</h3>
          <span className="rounded-full bg-[#1b2430] px-3 py-1 text-sm font-medium text-zinc-300">
            {allProjects.length} {allProjects.length === 1 ? 'проект' : allProjects.length < 5 ? 'проекта' : 'проектов'}
          </span>
        </div>
        {deviceError && (
          <div>
            <Alert variant="error">{deviceError}</Alert>
          </div>
        )}
        <div className="space-y-3">
          {allProjects.map((p) => {
            const results = calculateResults(p)
            const foundationVol = getFoundationVolume(p)
            const roofArea = getRoofArea(p)
            const hasWalls = hasWallDims(p)
            const wallsVol = p.resultsOverrides?.wallsVolume ?? results.volume
            const stats: string[] = []
            if (foundationVol != null) stats.push(`Фундамент: ${foundationVol.toFixed(2)} м³`)
            if (hasWalls) stats.push(`Стены: ${wallsVol.toFixed(2)} м³`)
            if (roofArea != null) stats.push(`Крыша: ${roofArea.toFixed(2)} м²`)
            return (
              <div
                key={p.id}
                className="rounded-[24px] bg-[#141a22] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
              >
                <Link href={`/projects/view?id=${encodeURIComponent(p.id)}`} className="block">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="min-w-0 flex-1 text-base font-semibold text-white line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="mt-1 text-xs font-medium text-zinc-400">
                        {projectTypeLabel(p)}
                      </p>
                    </div>
                  </div>

                  {stats.length > 0 ? (
                    <div className="mb-3 space-y-1 text-sm text-zinc-200">
                      {stats.map((s) => (
                        <p key={s}>{s}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-3 text-sm text-zinc-400">Нет заполненных разделов</p>
                  )}

                  <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <p>
                      Обновлено: {new Date(p.updatedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {p.platform === 'android' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-[11px] text-emerald-300" title="Создан на Android">
                        <AndroidIcon className="h-3.5 w-3.5" />
                        Android
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/12 px-2 py-1 text-[11px] text-blue-300" title="Создан в веб-версии">
                        <WebIcon className="h-3.5 w-3.5" />
                        Web
                      </span>
                    )}
                  </div>
                </Link>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void openPdfFromCard(p)
                    }}
                    disabled={loading === p.id}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#2f6fed] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    title="Открыть PDF"
                  >
                    {loading === p.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    ) : (
                      <>
                        <PdfIcon className="h-4 w-4" />
                        <span>PDF</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteClick(p)
                    }}
                    disabled={loading === p.id}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#2a1820] px-3 py-2.5 text-sm font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Удалить проект"
                  >
                    <DeleteIcon className="h-4 w-4" />
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <ConfirmModal
          isOpen={!!deleteModalProject}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Удалить проект?"
          description={
            deleteModalProject ? (
              <>
                Вы уверены, что хотите удалить проект{' '}
                <strong className="font-semibold text-white">{deleteModalProject.name}</strong>?{' '}
                Это действие невозможно отменить.
              </>
            ) : (
              ''
            )
          }
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          variant="danger"
        />

      </div>
    </>
  )
}
