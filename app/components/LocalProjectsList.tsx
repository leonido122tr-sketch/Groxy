'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FileText, Share2, Trash2, Smartphone, Monitor } from 'lucide-react'
import { type LocalProject, listLocalProjects, deleteLocalProject } from '@/lib/projects/localProjects'
import { deleteDeviceProject, listDeviceProjects } from '@/lib/projects/deviceProjects'
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

export function LocalProjectsList() {
  const [allProjects, setAllProjects] = useState<LocalProject[]>([])
  const [deviceAvailable, setDeviceAvailable] = useState(false)
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
      setDeviceAvailable(true)
      setDeviceError(null)
    } catch (e: any) {
      setDeviceAvailable(false)
      setDeviceError(e?.message ?? 'Не удалось прочитать память устройства')
    }
    
    // Убираем дубликаты по ID, оставляя более свежую версию
    const uniqueProjects = new Map<string, LocalProject>()
    for (const p of projects) {
      const existing = uniqueProjects.get(p.id)
      if (!existing || new Date(p.updatedAt) > new Date(existing.updatedAt)) {
        uniqueProjects.set(p.id, p)
      }
    }
    
    setAllProjects(Array.from(uniqueProjects.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ))
  }

  useEffect(() => {
    reload()
    
    // Слушаем событие для открытия PDF viewer
    const handleOpenPdfViewer = async (event: any) => {
      const { pdfData, pdfUrl, filename, uri } = event.detail
      console.log('Событие openPdfViewer получено:', { hasPdfData: !!pdfData, hasPdfUrl: !!pdfUrl, filename, hasUri: !!uri })
      
      // На Android используем FileOpener вместо PdfViewer
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        try {
          const { openPdfFromDevice } = await import('@/lib/pdf/pdfStorage')
          
          // Если есть URI сохранённого PDF, используем его
          if (uri) {
            await openPdfFromDevice(uri, pdfData instanceof Uint8Array ? pdfData : undefined, { userInitiated: true })
            return
          }
          
          // Если есть pdfData (bytes), сохраняем и открываем
          if (pdfData && pdfData instanceof Uint8Array) {
            const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
            const result = await savePdfToDevice(filename, pdfData)
            if (result) {
              const uri = typeof result === 'string' ? result : result.uri
              const filePath = typeof result === 'string' ? undefined : result.path
              await openPdfFromDevice(uri, pdfData, { userInitiated: true, filePath })
            }
            return
          }
          
          // Если есть только pdfUrl (blob URL) - это старый способ, который не должен использоваться на Android
          // Пытаемся прочитать blob и сохранить
          if (pdfUrl && !uri && !pdfData) {
            console.log('LocalProjectsList: получен blob URL на Android, пытаемся прочитать и сохранить')
            try {
              const response = await fetch(pdfUrl)
              const blob = await response.blob()
              const arrayBuffer = await blob.arrayBuffer()
              const bytes = new Uint8Array(arrayBuffer)
              
              const { savePdfToDevice, openPdfFromDevice } = await import('@/lib/pdf/pdfStorage')
              const result = await savePdfToDevice(filename, bytes)
              if (result) {
                const uri = typeof result === 'string' ? result : result.uri
                const filePath = typeof result === 'string' ? undefined : result.path
                await openPdfFromDevice(uri, bytes, { userInitiated: true, filePath })
                // Очищаем blob URL
                URL.revokeObjectURL(pdfUrl)
              }
              return
            } catch (fetchError) {
              console.error('LocalProjectsList: ошибка чтения blob URL:', fetchError)
            }
          }
          
          // Если ничего не сработало, просто игнорируем (не показываем PdfViewer на Android)
          console.warn('LocalProjectsList: на Android получено событие openPdfViewer без URI или pdfData, игнорируем')
          return
        } catch (error: any) {
          console.error('Ошибка открытия PDF через FileOpener в LocalProjectsList:', error)
          alert('Не удалось открыть PDF. Убедитесь, что у вас установлено приложение для просмотра PDF.')
          return
        }
      }
      
      // Для веб-версии и iOS показываем PdfViewer
      setPdfViewerData({ pdfData, pdfUrl, filename })
    }
    
    window.addEventListener('openPdfViewer', handleOpenPdfViewer as EventListener)

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
      window.removeEventListener('openPdfViewer', handleOpenPdfViewer as EventListener)
      window.removeEventListener('groxy:projects-changed', handleProjectsChanged as EventListener)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const generatePdf = async (project: LocalProject) => {
    if (loading) return
    setLoading(project.id)

    try {
      const results = calculateResults(project)
      const materialLabel = getMaterialLabel(project.data.material || '')
      const principleLabel = project.data.principle === 'inside' ? 'Внутри' : 'Снаружи'

      const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
      
      let pdfData: any = {
        title: project.name,
        includeMeta: false,
        materialLabel,
        principleLabel,
        dims: {},
        results,
        openings: (project.data.openings || []).map((o: any) => ({ width: o.width, height: o.height })),
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

      const bytes = await generatePdfClient(pdfData)
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${project.name.trim() || 'Проект_строительства'}_${stamp}.pdf`

      if (Capacitor.isNativePlatform()) {
        // На Android сохраняем PDF на устройство и открываем через нативный Intent (FileOpener)
        // pdf.js с worker не работает в Android WebView, поэтому используем стандартный способ
        console.log('[LocalProjectsList.generatePdf] Сохранение и открытие PDF на Android...')
        const { savePdfToDevice, openPdfFromDevice } = await import('@/lib/pdf/pdfStorage')
        const result = await savePdfToDevice(filename, bytes)
        if (!result) {
          console.error('[LocalProjectsList.generatePdf] Не удалось сохранить PDF на устройство')
          throw new Error('Не удалось сохранить PDF')
        }
        
        // Обрабатываем как объект { uri, path } или как строку (для обратной совместимости)
        const uri = typeof result === 'string' ? result : result.uri
        const filePath = typeof result === 'string' ? undefined : result.path
        
        console.log('[LocalProjectsList.generatePdf] PDF сохранён, URI:', uri, 'path:', filePath)
        console.log('[LocalProjectsList.generatePdf] Открытие PDF через FileOpener...')
        
        // Открываем через FileOpener (нативный Android Intent)
        // Используем filePath, если доступен (работает надёжнее, чем content:// URI)
        try {
          await openPdfFromDevice(uri, bytes, { userInitiated: true, filePath })
          console.log('[LocalProjectsList.generatePdf] PDF успешно открыт через FileOpener')
        } catch (openError: any) {
          console.error('[LocalProjectsList.generatePdf] Ошибка открытия PDF:', openError)
          throw new Error('Не удалось открыть PDF: ' + (openError?.message || 'неизвестная ошибка'))
        }
        return
      } else {
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }
    } catch (error: any) {
      alert(error?.message || 'Не удалось создать PDF')
    } finally {
      setLoading(null)
    }
  }

  const sharePdf = async (project: LocalProject) => {
    if (loading) return
    setLoading(project.id)

    try {
      const results = calculateResults(project)
      const materialLabel = getMaterialLabel(project.data.material || '')
      const principleLabel = project.data.principle === 'inside' ? 'Внутри' : 'Снаружи'

      const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
      
      let pdfData: any = {
        title: project.name,
        includeMeta: false,
        materialLabel,
        principleLabel,
        dims: {},
        results,
        openings: (project.data.openings || []).map((o: any) => ({ width: o.width, height: o.height })),
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

      const bytes = await generatePdfClient(pdfData)
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${project.name.trim() || 'Проект_строительства'}_${stamp}.pdf`

      if (Capacitor.isNativePlatform()) {
        // Используем Capacitor Share для нативных приложений
        const { Share } = await import('@capacitor/share')
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        
        const tempPath = `Groxy/temp_${Date.now()}_${filename}`
        
        // Эффективная конвертация Uint8Array в base64 (избегаем переполнения стека)
        function uint8ArrayToBase64(bytes: Uint8Array): string {
          let binary = ''
          const len = bytes.byteLength
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          return btoa(binary)
        }
        
        const base64Data = uint8ArrayToBase64(bytes)
        
        await Filesystem.mkdir({
          path: 'Groxy',
          directory: Directory.Documents,
          recursive: true,
        }).catch(() => {})
        
        await Filesystem.writeFile({
          path: tempPath,
          data: base64Data,
          directory: Directory.Documents,
        })
        
        const fileUri = await Filesystem.getUri({
          path: tempPath,
          directory: Directory.Documents,
        })
        
        await Share.share({
          title: project.name.trim() || 'Проект строительства',
          text: project.name.trim() || 'Проект строительства',
          url: fileUri.uri,
          dialogTitle: 'Поделиться PDF',
        })
        
        // Удаляем временный файл после небольшой задержки
        setTimeout(() => {
          Filesystem.deleteFile({
            path: tempPath,
            directory: Directory.Documents,
          }).catch(() => {})
        }, 10000)
      } else {
        // Для браузеров используем Web Share API
        const file = new File([new Blob([bytes as BlobPart], { type: 'application/pdf' })], filename, { type: 'application/pdf' })
        const nav: any = navigator
        
        if (nav?.share) {
          const canShareFiles = typeof nav.canShare === 'function' ? nav.canShare({ files: [file] }) : true
          if (canShareFiles) {
            try {
              await nav.share({ 
                title: filename, 
                text: project.name.trim() || 'Проект строительства', 
                files: [file] 
              })
            } catch (e: any) {
              if (e.name !== 'AbortError') {
                throw e
              }
            }
          } else {
            throw new Error('Браузер не поддерживает отправку файлов')
          }
        } else {
          throw new Error('Браузер не поддерживает функцию "Поделиться"')
        }
      }
    } catch (error: any) {
      alert(error?.message || 'Не удалось поделиться PDF')
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
    } catch (error: any) {
      alert(error?.message || 'Не удалось удалить проект')
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
        <div className="mt-6">
          <p className="text-sm text-zinc-400">Проекты не найдены.</p>
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
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-white">Мои проекты</h3>
        {deviceError && <p className="mt-2 text-xs text-red-400">{deviceError}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allProjects.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <Link href={`/projects/view?id=${encodeURIComponent(p.id)}`} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{p.name}</p>
                    <p className="mt-1 text-xs font-medium text-zinc-300">
                      {projectTypeLabel(p)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Обновлено: {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  {p.platform === 'android' ? (
                    <span title="Создан на Android">
                      <Smartphone className="h-5 w-5 flex-shrink-0 text-green-400" />
                    </span>
                  ) : (
                    <span title="Создан в веб-версии">
                      <Monitor className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    </span>
                  )}
                </div>
              </Link>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void generatePdf(p)
                  }}
                  disabled={loading === p.id}
                  className="flex min-w-[72px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  title="Открыть PDF"
                >
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void sharePdf(p)
                  }}
                  disabled={loading === p.id}
                  className="flex items-center justify-center rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                  title="Поделиться PDF"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDeleteClick(p)
                  }}
                  disabled={loading === p.id}
                  className="flex items-center justify-center rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                  title="Удалить проект"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Модальное окно подтверждения удаления */}
        {deleteModalProject && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={handleDeleteCancel}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-6 shadow-lg backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white">Удалить проект?</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Вы уверены, что хотите удалить проект <strong className="text-white">{deleteModalProject.name}</strong>? Это действие нельзя
                отменить.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
