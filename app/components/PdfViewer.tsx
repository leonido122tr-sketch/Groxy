'use client'

import { useEffect, useRef, useState } from 'react'

interface PdfViewerProps {
  pdfData?: Uint8Array | string // base64 string или Uint8Array (опционально)
  pdfUrl?: string // blob URL или обычный URL (опционально)
  filename: string
  onClose: () => void
  onShare?: () => void
}

interface PdfJsDocument {
  numPages: number
  destroy?: () => Promise<void>
  getPage: (pageNumber: number) => Promise<PdfJsPage>
}

interface PdfJsRenderParams {
  canvasContext: CanvasRenderingContext2D
  viewport: { width: number; height: number }
  background?: string
}
interface PdfJsPage {
  getViewport: (params: { scale: number }) => { width: number; height: number }
  render: (params: PdfJsRenderParams) => { cancel: () => void; promise: Promise<void> }
}

interface PdfJsLib {
  GlobalWorkerOptions?: { workerSrc?: string }
  getDocument: (src: unknown) => { promise: Promise<PdfJsDocument> }
  disableWorker?: boolean
  [k: string]: unknown
}
declare global {
  interface Window {
    __GROXY_PDFJS_WORKER_SRC__?: string
    __GROXY_PDFJS__?: PdfJsLib
  }
}

export function PdfViewer({ pdfData, pdfUrl, filename, onClose, onShare }: PdfViewerProps) {
  const [error, setError] = useState<string | null>(null)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const pdfRef = useRef<PdfJsDocument | null>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const renderTasksRef = useRef<Array<{ cancel: () => void }>>([])
  const workerInitializedRef = useRef<boolean>(false)

  const multiPage = numPages > 1

  // Глобальная предзагрузка pdf.js модуля при первом монтировании компонента
  // Это должно быть ДО любого использования pdf.js
  useEffect(() => {
    if (workerInitializedRef.current) return
    workerInitializedRef.current = true
    
    // Предзагружаем pdf.js модуль для кэширования
    // Важно: делаем это сразу, не ждём использования компонента
    // Используем немедленный вызов (IIFE) для асинхронной предзагрузки
    ;(async () => {
      try {
        const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs')
        const pdfjs = (pdfjsModule as unknown as PdfJsLib)
        if (pdfjs) {
          const origin =
            typeof window !== 'undefined' && window.location?.origin
              ? window.location.origin
              : ''
          const workerSrc = origin
            ? new URL('/pdf.worker.min.mjs', origin).toString()
            : '/pdf.worker.min.mjs'
          if (!pdfjs.GlobalWorkerOptions) {
            pdfjs.GlobalWorkerOptions = {}
          }
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
          window.__GROXY_PDFJS_WORKER_SRC__ = workerSrc
          // Сохраняем ссылку на модуль для последующего использования
          window.__GROXY_PDFJS__ = pdfjs as PdfJsLib
          console.log('PdfViewer: pdf.js модуль предзагружен и кэширован')
        }
      } catch (e) {
        console.warn('PdfViewer: не удалось предзагрузить pdf.js модуль', e)
      }
    })()
  }, [])

  // Получаем URL для отображения PDF
  useEffect(() => {
    try {
      if (pdfUrl) {
        setDisplayUrl(pdfUrl)
        return
      }
      
      if (pdfData) {
        let bytes: Uint8Array
        if (typeof pdfData === 'string') {
          // Это base64 строка
          const binaryString = atob(pdfData)
          bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
        } else {
          bytes = pdfData
        }
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        setDisplayUrl(blobUrl)
        return
      }
      
      setError('Не указаны данные PDF')
    } catch (err: unknown) {
      console.error('Ошибка создания blob URL:', err)
      const message = err instanceof Error ? err.message : String(err)
      setError('Не удалось подготовить PDF для отображения: ' + message)
    }
  }, [pdfData, pdfUrl])

  // Загружаем PDF документ через pdf.js (canvas рендер), чтобы избежать "чёрного экрана" в Android WebView
  useEffect(() => {
    let cancelled = false

    const cleanup = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {}
          renderTaskRef.current = null
        }
        renderTasksRef.current.forEach((t) => {
          try {
            t.cancel()
          } catch {}
        })
        renderTasksRef.current = []
        if (pdfRef.current) {
          try {
            await pdfRef.current.destroy?.()
          } catch {}
          pdfRef.current = null
        }
      } catch {}
    }

    const load = async () => {
      if (!displayUrl) return
      setError(null)
      setLoading(true)
      try {
        const res = await fetch(displayUrl)
        if (!res.ok) throw new Error(`Не удалось загрузить PDF (HTTP ${res.status})`)
        const buf = await res.arrayBuffer()
        const data = new Uint8Array(buf)

        // legacy build: стабильнее в средах без полноценной поддержки модульных worker'ов
        // В pdfjs-dist@5 путь содержит .mjs
        // КРИТИЧНО: используем предзагруженный модуль, если он есть, иначе импортируем
        let pdfjs: PdfJsLib
        
        // Если предзагруженный модуль есть — используем его
        if (window.__GROXY_PDFJS__) {
          pdfjs = window.__GROXY_PDFJS__
          console.log('PdfViewer: используем предзагруженный pdf.js модуль')
        } else {
          // Импортируем модуль
          const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs')
          pdfjs = pdfjsModule as unknown as PdfJsLib
          // Сохраняем для последующего использования
          window.__GROXY_PDFJS__ = pdfjs
        }
        
        const workerSrc =
          window.__GROXY_PDFJS_WORKER_SRC__ ||
          (typeof window !== 'undefined'
            ? new URL('/pdf.worker.min.mjs', window.location.origin).toString()
            : '/pdf.worker.min.mjs')

        // Всегда перезаписываем workerSrc перед использованием
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
          console.log('PdfViewer: workerSrc принудительно установлен:', pdfjs.GlobalWorkerOptions.workerSrc)
        }
        
        if (typeof pdfjs.disableWorker !== 'undefined') {
          pdfjs.disableWorker = false
          console.log('PdfViewer: worker включён (disableWorker = false)')
        }
        
        const loadTask = pdfjs.getDocument({ data })
        const pdf = await loadTask.promise
        if (cancelled) {
          try {
            await pdf.destroy?.()
          } catch {}
          return
        }
        pdfRef.current = pdf
        setNumPages(Number(pdf.numPages || 0))
        setPageNumber(1)
      } catch (e: unknown) {
        console.error('PdfViewer: ошибка загрузки pdf.js:', e)
        const message = e instanceof Error ? e.message : String(e)
        setError('Не удалось открыть PDF внутри приложения: ' + message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void cleanup().then(load)

    return () => {
      cancelled = true
      void cleanup()
    }
  }, [displayUrl])

  // Рендерим текущую страницу (режим одной страницы)
  useEffect(() => {
    if (multiPage) return
    let cancelled = false

    const render = async () => {
      if (!pdfRef.current) return
      if (!canvasRef.current) return
      if (!numPages) return
      if (pageNumber < 1 || pageNumber > numPages) return

      setRendering(true)
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {}
          renderTaskRef.current = null
        }

        const pdf = pdfRef.current
        const page = await pdf.getPage(pageNumber)
        if (cancelled) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas context недоступен')

        canvas.width = Math.max(1, Math.floor(viewport.width))
        canvas.height = Math.max(1, Math.floor(viewport.height))
        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.restore()

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          background: 'white',
        })
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (e: unknown) {
        console.error('PdfViewer: ошибка рендера страницы:', e)
        const message = e instanceof Error ? e.message : String(e)
        setError('Не удалось отрисовать PDF: ' + message)
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void render()
    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {}
        renderTaskRef.current = null
      }
    }
  }, [multiPage, numPages, pageNumber, scale])

  // Рендерим все страницы вертикально (режим нескольких страниц)
  useEffect(() => {
    if (!multiPage || !pdfRef.current || !numPages) return
    let cancelled = false
    const pdf = pdfRef.current
    const tasks: Array<{ cancel: () => void }> = []

    const renderAll = async () => {
      setRendering(true)
      try {
        renderTasksRef.current.forEach((t) => {
          try {
            t.cancel()
          } catch {}
        })
        renderTasksRef.current = []

        for (let n = 1; n <= numPages; n++) {
          if (cancelled) break
          const canvas = canvasRefs.current[n - 1]
          if (!canvas) continue
          const page = await pdf.getPage(n)
          if (cancelled) break
          const viewport = page.getViewport({ scale })
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          canvas.width = Math.max(1, Math.floor(viewport.width))
          canvas.height = Math.max(1, Math.floor(viewport.height))
          ctx.save()
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.restore()
          const renderTask = page.render({
            canvasContext: ctx,
            viewport,
            background: 'white',
          })
          tasks.push(renderTask)
          renderTasksRef.current = tasks
          await renderTask.promise
        }
      } catch (e: unknown) {
        console.error('PdfViewer: ошибка рендера страниц:', e)
        const message = e instanceof Error ? e.message : String(e)
        setError('Не удалось отрисовать PDF: ' + message)
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void renderAll()
    return () => {
      cancelled = true
      tasks.forEach((t) => {
        try {
          t.cancel()
        } catch {}
      })
      renderTasksRef.current = []
    }
  }, [multiPage, numPages, scale])

  // Очищаем blob URL при размонтировании
  useEffect(() => {
    return () => {
      if (displayUrl && displayUrl.startsWith('blob:')) {
        URL.revokeObjectURL(displayUrl)
      }
    }
  }, [displayUrl])

  if (error) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-900 pt-safe pb-safe pdf-overlay">
        <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <h2 className="flex-1 truncate text-center text-base font-semibold text-white">
          {filename}
        </h2>
        <div className="ml-4 flex items-center gap-2">
          {onShare && (
            <button
              onClick={onShare}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600"
            >
              Поделиться
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            ✕ Закрыть
          </button>
        </div>
        </div>
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-white">
            <p className="text-lg font-semibold text-red-400">Ошибка</p>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!displayUrl || loading) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-900 pt-safe pb-safe pdf-overlay">
        <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <h2 className="flex-1 truncate text-center text-base font-semibold text-white">
          {filename}
        </h2>
        <div className="ml-4 flex items-center gap-2">
          {onShare && (
            <button
              onClick={onShare}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600"
            >
              Поделиться
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            ✕ Закрыть
          </button>
        </div>
        </div>
        <div className="flex h-full items-center justify-center">
          <p className="text-white">Загрузка PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-900 pt-safe pb-safe pdf-overlay">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <h2 className="flex-1 truncate text-center text-base font-semibold text-white">
          {filename}
        </h2>
        <div className="flex items-center gap-2">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600"
            >
              Поделиться
            </button>
          )}
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, Number((s - 0.15).toFixed(2))))}
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600"
            title="Уменьшить"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, Number((s + 0.15).toFixed(2))))}
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600"
            title="Увеличить"
          >
            +
          </button>
          {!multiPage && (
            <>
              <button
                type="button"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
                title="Предыдущая страница"
              >
                ←
              </button>
              <div className="min-w-[88px] text-center text-xs text-zinc-200">
                {numPages ? `${pageNumber} / ${numPages}` : '...'}
              </div>
              <button
                type="button"
                onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))}
                disabled={!!numPages && pageNumber >= numPages}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
                title="Следующая страница"
              >
                →
              </button>
            </>
          )}
          {multiPage && (
            <span className="min-w-[64px] text-center text-xs text-zinc-300">
              {numPages} стр.
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
        >
          ✕ Закрыть
        </button>
      </div>

      {/* PDF Content - одна страница или вертикальный список страниц */}
      <div className="flex-1 overflow-auto bg-zinc-900">
        <div className="mx-auto w-full max-w-4xl p-3">
          {rendering && <p className="mb-2 text-center text-xs text-zinc-300">Отрисовка{multiPage ? ' страниц...' : ' страницы...'}</p>}
          {multiPage ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <div key={pageNum} className="rounded-lg bg-white p-2 shadow-sm">
                  <div className="mb-1 text-center text-xs text-zinc-500">Страница {pageNum}</div>
                  <canvas
                    ref={(el) => {
                      if (el) {
                        canvasRefs.current[pageNum - 1] = el
                      }
                    }}
                    className="h-auto w-full"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-2">
              <canvas ref={canvasRef} className="h-auto w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
