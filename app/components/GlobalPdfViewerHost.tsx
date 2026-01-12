'use client'

import { useEffect, useState } from 'react'
import { PdfViewer } from './PdfViewer'
import { Capacitor } from '@capacitor/core'

type PdfViewerPayload = {
  filename: string
  pdfUrl?: string
  pdfData?: string | Uint8Array
  uri?: string // URI сохранённого PDF на устройстве (для Android)
}

declare global {
  interface Window {
    __GROXY_LAST_PDF_VIEWER__?: PdfViewerPayload
  }
}

export function GlobalPdfViewerHost() {
  const [payload, setPayload] = useState<PdfViewerPayload | null>(null)

  useEffect(() => {
    const handle = async (event: any) => {
      const detail = event?.detail || {}
      const next: PdfViewerPayload = {
        filename: String(detail.filename || 'document.pdf'),
        pdfUrl: typeof detail.pdfUrl === 'string' ? detail.pdfUrl : undefined,
        pdfData: detail.pdfData,
        uri: detail.uri, // URI сохранённого PDF (если есть)
      }
      console.log('GlobalPdfViewerHost: openPdfViewer', {
        filename: next.filename,
        hasPdfUrl: !!next.pdfUrl,
        hasPdfData: !!next.pdfData,
        hasUri: !!next.uri,
        platform: Capacitor.getPlatform(),
      })

      // На Android используем FileOpener вместо PdfViewer
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        try {
          // Если есть URI сохранённого PDF, используем его
          if (next.uri) {
            console.log('GlobalPdfViewerHost: открытие PDF через FileOpener на Android, URI:', next.uri)
            const { FileOpener } = await import('@capawesome-team/capacitor-file-opener')
            await FileOpener.openFile({
              path: next.uri,
              mimeType: 'application/pdf',
            })
            console.log('GlobalPdfViewerHost: FileOpener.openFile успешно вызван')
            // Не показываем PdfViewer на Android
            return
          }
          
          // Если есть pdfData (bytes), сохраняем и открываем
          if (next.pdfData && next.pdfData instanceof Uint8Array) {
            console.log('GlobalPdfViewerHost: сохранение PDF перед открытием через FileOpener')
            const { savePdfToDevice, openPdfFromDevice } = await import('@/lib/pdf/pdfStorage')
            const result = await savePdfToDevice(next.filename, next.pdfData)
            if (result) {
              const uri = typeof result === 'string' ? result : result.uri
              const filePath = typeof result === 'string' ? undefined : result.path
              await openPdfFromDevice(uri, next.pdfData, { userInitiated: true, filePath })
              // Не показываем PdfViewer на Android
              return
            }
          }
          
          // Если есть только pdfUrl (blob URL) - это старый способ, который не должен использоваться на Android
          // Пытаемся прочитать blob и сохранить
          if (next.pdfUrl && !next.uri && !next.pdfData) {
            console.log('GlobalPdfViewerHost: получен blob URL на Android, пытаемся прочитать и сохранить')
            try {
              const response = await fetch(next.pdfUrl)
              const blob = await response.blob()
              const arrayBuffer = await blob.arrayBuffer()
              const bytes = new Uint8Array(arrayBuffer)
              
              const { savePdfToDevice, openPdfFromDevice } = await import('@/lib/pdf/pdfStorage')
              const result = await savePdfToDevice(next.filename, bytes)
              if (result) {
                const uri = typeof result === 'string' ? result : result.uri
                const filePath = typeof result === 'string' ? undefined : result.path
                await openPdfFromDevice(uri, bytes, { userInitiated: true, filePath })
                // Очищаем blob URL
                URL.revokeObjectURL(next.pdfUrl)
                return
              }
            } catch (fetchError) {
              console.error('GlobalPdfViewerHost: ошибка чтения blob URL:', fetchError)
            }
          }
          
          // Если ничего не сработало, просто игнорируем (не показываем PdfViewer на Android)
          console.warn('GlobalPdfViewerHost: на Android получено событие openPdfViewer без URI или pdfData, игнорируем')
          return
        } catch (error: any) {
          console.error('GlobalPdfViewerHost: ошибка открытия PDF через FileOpener:', error)
          // В случае ошибки не показываем PdfViewer (он не работает на Android)
          alert('Не удалось открыть PDF. Убедитесь, что у вас установлено приложение для просмотра PDF.')
          return
        }
      }

      // Для веб-версии и iOS показываем PdfViewer
      setPayload(next)
    }

    window.addEventListener('openPdfViewer', handle as EventListener)

    // Если событие прилетело до того, как React успел смонтироваться
    if (window.__GROXY_LAST_PDF_VIEWER__) {
      void handle({ detail: window.__GROXY_LAST_PDF_VIEWER__ })
    }

    return () => {
      window.removeEventListener('openPdfViewer', handle as EventListener)
    }
  }, [])

  // На Android не показываем PdfViewer (используем FileOpener)
  if (!payload || (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android')) {
    return null
  }

  return (
    <PdfViewer
      filename={payload.filename}
      pdfUrl={payload.pdfUrl}
      pdfData={payload.pdfData}
      onClose={() => setPayload(null)}
    />
  )
}



