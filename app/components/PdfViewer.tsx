'use client'

import { useEffect, useRef, useState } from 'react'

interface PdfViewerProps {
  pdfData?: Uint8Array | string // base64 string или Uint8Array (опционально)
  pdfUrl?: string // blob URL или обычный URL (опционально)
  filename: string
  onClose: () => void
}

export function PdfViewer({ pdfData, pdfUrl, filename, onClose }: PdfViewerProps) {
  const [error, setError] = useState<string | null>(null)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)
  const workerInitializedRef = useRef<boolean>(false)

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
        const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
        const pdfjs = pdfjsModule.default || pdfjsModule
        if (pdfjs) {
          // Сохраняем ссылку на модуль для последующего использования
          ;(window as any).__GROXY_PDFJS__ = pdfjs
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
    } catch (err: any) {
      console.error('Ошибка создания blob URL:', err)
      setError('Не удалось подготовить PDF для отображения: ' + err?.message)
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
        let pdfjs: any
        
        // Если предзагруженный модуль есть — используем его
        if ((window as any).__GROXY_PDFJS__) {
          pdfjs = (window as any).__GROXY_PDFJS__
          console.log('PdfViewer: используем предзагруженный pdf.js модуль')
        } else {
          // Импортируем модуль
          const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
          pdfjs = pdfjsModule.default || pdfjsModule
          // Сохраняем для последующего использования
          ;(window as any).__GROXY_PDFJS__ = pdfjs
        }
        
        if (!pdfjs) {
          throw new Error('PdfViewer: не удалось загрузить pdf.js модуль')
        }
        
        // КРИТИЧНО: отключаем worker для Android WebView (где worker'ы нестабильны).
        // Устанавливаем disableWorker на самом объекте pdfjs, а не в опциях getDocument.
        if (typeof pdfjs.disableWorker !== 'undefined') {
          pdfjs.disableWorker = true
          console.log('PdfViewer: worker отключён (disableWorker = true)')
        }
        
        // Также устанавливаем workerSrc в пустую строку для дополнительной защиты
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = ''
          console.log('PdfViewer: workerSrc установлен в ""')
        }
        
        const task = pdfjs.getDocument({
          data,
          // Дополнительно отключаем worker через опцию (на случай, если disableWorker не сработает)
          disableWorker: true,
        })

        const pdf = await task.promise
        if (cancelled) {
          try {
            await pdf.destroy?.()
          } catch {}
          return
        }
        pdfRef.current = pdf
        setNumPages(Number(pdf.numPages || 0))
        setPageNumber(1)
      } catch (e: any) {
        console.error('PdfViewer: ошибка загрузки pdf.js:', e)
        setError('Не удалось открыть PDF внутри приложения: ' + (e?.message || String(e)))
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

  // Рендерим текущую страницу
  useEffect(() => {
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

        // Явно делаем белый фон (на некоторых WebView иначе виден чёрный фон)
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
      } catch (e: any) {
        console.error('PdfViewer: ошибка рендера страницы:', e)
        setError('Не удалось отрисовать PDF: ' + (e?.message || String(e)))
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
  }, [numPages, pageNumber, scale])

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
      <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
          <h2 className="flex-1 truncate text-center text-base font-semibold text-white">
            {filename}
          </h2>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            ✕ Закрыть
          </button>
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
      <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
          <h2 className="flex-1 truncate text-center text-base font-semibold text-white">
            {filename}
          </h2>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            ✕ Закрыть
          </button>
        </div>
        <div className="flex h-full items-center justify-center">
          <p className="text-white">Загрузка PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <h2 className="flex-1 truncate text-center text-base font-semibold text-white">
          {filename}
        </h2>
        <div className="flex items-center gap-2">
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
        </div>
        <button
          onClick={onClose}
          className="ml-4 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
        >
          ✕ Закрыть
        </button>
      </div>

      {/* PDF Content - canvas (pdf.js) */}
      <div className="flex-1 overflow-auto bg-zinc-900">
        <div className="mx-auto w-full max-w-4xl p-3">
          {rendering && <p className="mb-2 text-center text-xs text-zinc-300">Отрисовка страницы...</p>}
          <div className="rounded-lg bg-white p-2">
            <canvas ref={canvasRef} className="h-auto w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
