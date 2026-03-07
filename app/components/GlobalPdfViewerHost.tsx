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
    const handle = async (event: CustomEvent) => {
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

      setPayload(next)
    }

    const listener: EventListener = (evt) => void handle(evt as CustomEvent)
    window.addEventListener('openPdfViewer', listener)

    // Если событие прилетело до того, как React успел смонтироваться
    if (window.__GROXY_LAST_PDF_VIEWER__) {
      void handle({ detail: window.__GROXY_LAST_PDF_VIEWER__ } as CustomEvent)
    }

    return () => {
      window.removeEventListener('openPdfViewer', listener)
    }
  }, [])

  if (!payload) {
    return null
  }

  const handleShare = async () => {
    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const { Share } = await import('@capacitor/share')
        const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
        const shareFilename = payload.filename.endsWith('.pdf') ? payload.filename : `${payload.filename}.pdf`

        if (payload.pdfData) {
          let bytes: Uint8Array
          if (typeof payload.pdfData === 'string') {
            const binary = atob(payload.pdfData)
            bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          } else {
            bytes = payload.pdfData
          }
          const nameForShare = `share_${Date.now()}_${shareFilename}`
          const result = await savePdfToDevice(nameForShare, bytes)
          const shareUrl = result ? (typeof result === 'string' ? result : (result.path ? `file://${result.path}` : result.uri)) : null
          if (shareUrl && (shareUrl.startsWith('file://') || shareUrl.startsWith('http'))) {
            await Share.share({
              title: payload.filename,
              url: shareUrl,
              dialogTitle: 'Поделиться PDF',
            })
            return
          }
        }
        alert('Не удалось подготовить файл для шаринга')
        return
      }

      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share')
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const shareFilename = payload.filename.endsWith('.pdf') ? payload.filename : `${payload.filename}.pdf`
        if (payload.pdfData) {
          let base64Data: string
          if (typeof payload.pdfData === 'string') {
            base64Data = payload.pdfData
          } else {
            let binary = ''
            for (let i = 0; i < payload.pdfData.byteLength; i++) {
              binary += String.fromCharCode(payload.pdfData[i])
            }
            base64Data = btoa(binary)
          }
          const cachePath = `Groxy/share/${shareFilename}`
          await Filesystem.writeFile({
            path: cachePath,
            data: base64Data,
            directory: Directory.Cache,
          })
          const fileUri = await Filesystem.getUri({
            path: cachePath,
            directory: Directory.Cache,
          })
          await Share.share({
            title: payload.filename,
            url: fileUri.uri,
            dialogTitle: 'Поделиться PDF',
          })
          return
        }
        if (payload.pdfUrl && payload.pdfUrl.startsWith('file://')) {
          await Share.share({
            title: payload.filename,
            url: payload.pdfUrl,
            dialogTitle: 'Поделиться PDF',
          })
          return
        }
        alert('Не удалось подготовить файл для шаринга')
        return
      }
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        const nav = navigator as Navigator & { share: (data: ShareData) => Promise<void> }
        if (payload.pdfData) {
          let bytes: Uint8Array
          if (typeof payload.pdfData === 'string') {
            const binary = atob(payload.pdfData)
            bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          } else {
            bytes = payload.pdfData
          }
          const file = new File([bytes.buffer as ArrayBuffer], payload.filename, { type: 'application/pdf' })
          await nav.share({ title: payload.filename, files: [file] })
          return
        }
        if (payload.pdfUrl) {
          await nav.share({ title: payload.filename, url: payload.pdfUrl })
          return
        }
      }
    } catch (e) {
      console.error('GlobalPdfViewerHost: share error', e)
    }
  }

  return (
    <PdfViewer
      filename={payload.filename}
      pdfUrl={payload.pdfUrl}
      pdfData={payload.pdfData}
      onClose={() => setPayload(null)}
      onShare={handleShare}
    />
  )
}



