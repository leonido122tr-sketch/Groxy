'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { ArrowLeft } from 'lucide-react'
import { PdfViewer } from '@/app/components/PdfViewer'

function PdfViewerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pdfUri, setPdfUri] = useState<string | null>(null)
  // const [shareUri, setShareUri] = useState<string | null>(null) // Unused
  const [pdfData, setPdfData] = useState<string | null>(null) // base64 data
  const [filename, setFilename] = useState<string>('')
  // const [filePath, setFilePath] = useState<string | null>(null) // Unused
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const returnTo = searchParams.get('returnTo') || (typeof window !== 'undefined' ? sessionStorage.getItem('pdfViewerReturnTo') : null) || ''

  const goBack = () => {
    if (returnTo && returnTo.startsWith('/')) {
      router.push(returnTo)
    } else {
      router.back()
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('PdfViewerPage: useEffect вызван')
    
    const loadPdf = async () => {
      try {
        console.log('PdfViewerPage: loadPdf вызван')
        
        // Сначала проверяем параметры URL
        const uriParam = searchParams.get('uri')
        const filenameParam = searchParams.get('filename')
        const projectNameParam = searchParams.get('projectName') || ''
        const projectDateParam = searchParams.get('projectDate') || ''
        const returnToParam = searchParams.get('returnTo') || ''
        console.log('PdfViewerPage: URL параметры:', { uriParam, filenameParam, projectNameParam, projectDateParam, returnToParam })
        
        // Затем проверяем sessionStorage
        const uri = uriParam || sessionStorage.getItem('pdfViewerUri')
        const base64 = sessionStorage.getItem('pdfViewerPdfBytes')
        const name = filenameParam || sessionStorage.getItem('pdfViewerFilename') || 'document.pdf'
        console.log('PdfViewerPage: URI из sessionStorage:', uri ? 'найден' : 'не найден')
        console.log('PdfViewerPage: filename:', name)

        if (!uri && !base64) {
          // На Android можем загрузить PDF по имени файла из системного хранилища
          if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && name) {
            const nativeStorage = (window as Window & { NativeStorage?: { getPdfBase64: (name: string) => string; listPdfs: () => string } }).NativeStorage
            console.log('PdfViewerPage: нет URI/base64, пробуем получить по имени через NativeStorage')
            if (nativeStorage && typeof nativeStorage.getPdfBase64 === 'function') {
              try {
                const base64Result = nativeStorage.getPdfBase64(name)
                if (base64Result && !base64Result.includes('error') && !base64Result.startsWith('{')) {
                  const dataUri = `data:application/pdf;base64,${base64Result}`
                  setPdfData(base64Result)
                  setPdfUri(dataUri)
                  setLoading(false)
                  return
                }
              } catch (e) {
                console.error('PdfViewerPage: Ошибка getPdfBase64 по имени:', e)
              }
            }
          }

          // Если имя не сработало, пробуем подобрать файл по названию проекта
          if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && projectNameParam) {
            const nativeStorage = (window as Window & { NativeStorage?: { getPdfBase64: (name: string) => string; listPdfs: () => string } }).NativeStorage
            if (nativeStorage && typeof nativeStorage.listPdfs === 'function' && typeof nativeStorage.getPdfBase64 === 'function') {
              try {
                const listStr = nativeStorage.listPdfs()
                const list = JSON.parse(listStr)
                if (Array.isArray(list)) {
                  const sanitized = projectNameParam.replace(/[\\/:*?"<>|]+/g, '').trim()
                  const prefix = `${sanitized}_`
                  const exact = projectDateParam ? `${sanitized}_${projectDateParam}.pdf` : null
                  let candidate: string | null = null
                  if (exact && list.includes(exact)) {
                    candidate = exact
                  } else {
                    const candidates = list.filter(
                      (n: string) => typeof n === 'string' && n.startsWith(prefix) && n.endsWith('.pdf'),
                    )
                    if (candidates.length) {
                      candidates.sort()
                      candidate = candidates[candidates.length - 1]
                    }
                  }
                  if (candidate) {
                    const base64Result = nativeStorage.getPdfBase64(candidate)
                    if (base64Result && !base64Result.includes('error') && !base64Result.startsWith('{')) {
                      const dataUri = `data:application/pdf;base64,${base64Result}`
                      setPdfData(base64Result)
                      setPdfUri(dataUri)
                      setFilename(candidate)
                      setLoading(false)
                      return
                    }
                  }
                }
              } catch (e) {
                console.error('PdfViewerPage: Ошибка поиска PDF по названию проекта:', e)
              }
            }
          }

          console.error('PdfViewerPage: PDF файл не найден')
          setError('PDF файл не найден')
          setLoading(false)
          return
        }

        setFilename(name)
        if (projectNameParam) sessionStorage.setItem('pdfViewerProjectName', projectNameParam)
        if (projectDateParam) sessionStorage.setItem('pdfViewerProjectDate', projectDateParam)
        // setShareUri(uri || null)
        // setFilePath(savedFilePath)

        // Для веб-версии: если есть base64, создаём blob URL (старые blob ссылки могут быть невалидны)
        if (!Capacitor.isNativePlatform() && base64) {
          try {
            const binary = atob(base64)
            const len = binary.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
            const blob = new Blob([bytes], { type: 'application/pdf' })
            const blobUrl = URL.createObjectURL(blob)
            setPdfUri(blobUrl)
            setPdfData(base64)
            setLoading(false)
            // Очищаем sessionStorage после загрузки
            if (!uriParam) {
              sessionStorage.removeItem('pdfViewerUri')
              sessionStorage.removeItem('pdfViewerFilename')
            }
            return
          } catch (e) {
            console.warn('PdfViewerPage: Ошибка сборки PDF из base64, используем URI', e)
          }
        }

        // На Android нужно использовать другой подход для загрузки PDF
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          // Для Android читаем файл через JavaScript Interface и конвертируем в base64
          const nativeStorage = (window as Window & { NativeStorage?: { getPdfBase64: (name: string) => string; listPdfs: () => string } }).NativeStorage
          console.log('PdfViewerPage: NativeStorage доступен:', !!nativeStorage)
          
          if (nativeStorage && typeof nativeStorage.getPdfBase64 === 'function') {
            try {
              console.log('PdfViewerPage: Вызов getPdfBase64 с filename:', name)
              const base64Result = nativeStorage.getPdfBase64(name)
              console.log('PdfViewerPage: getPdfBase64 вернул результат, длина:', base64Result?.length || 0)
              console.log('PdfViewerPage: Первые 100 символов:', base64Result?.substring(0, 100))
              
              if (base64Result && !base64Result.includes('error') && !base64Result.startsWith('{')) {
                // Успешно получили base64 данные
                const dataUri = `data:application/pdf;base64,${base64Result}`
                setPdfData(base64Result)
                setPdfUri(dataUri)
                console.log('PdfViewerPage: PDF загружен как base64 data URI, длина:', base64Result.length)
              } else {
                // Если вернулась ошибка, пробуем использовать URI напрямую
                console.warn('PdfViewerPage: getPdfBase64 вернул ошибку:', base64Result?.substring(0, 200))
                console.warn('PdfViewerPage: используем URI напрямую:', uri)
                setPdfUri(uri)
              }
            } catch (e) {
              console.error('PdfViewerPage: Ошибка загрузки PDF через JavaScript Interface:', e)
              // Запасной вариант - используем URI напрямую
              setPdfUri(uri)
            }
          } else {
            console.warn('PdfViewerPage: NativeStorage.getPdfBase64 не доступен, используем URI напрямую')
            // Запасной вариант - используем URI напрямую
            setPdfUri(uri)
          }
        } else {
          // Для веб-версии используем URI напрямую
          setPdfUri(uri)
        }

        // Очищаем sessionStorage после загрузки
        if (!uriParam) {
          sessionStorage.removeItem('pdfViewerUri')
          sessionStorage.removeItem('pdfViewerFilename')
        }
        
        setLoading(false)
      } catch (err: unknown) {
        console.error('Ошибка загрузки PDF:', err)
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
        setError('Ошибка загрузки PDF: ' + message)
        setLoading(false)
      }
    }

    loadPdf()
  }, [searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-red-500">Ошибка</h1>
          <p className="mt-2 text-zinc-400">{error}</p>
        </main>
      </div>
    )
  }

  if (loading || !pdfUri) {
    return (
      <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <p className="text-zinc-400">Загрузка PDF...</p>
        </main>
      </div>
    )
  }

  const handleShare = async () => {
    const rawTitle = filename || 'document.pdf'
    const shareTitle = rawTitle.endsWith('.pdf') ? rawTitle : `${rawTitle}.pdf`
    // Имя для шаринга: "Название проекта_ДД-ММ-ГГГГ.pdf"
    const projectName = searchParams.get('projectName') || (typeof window !== 'undefined' ? sessionStorage.getItem('pdfViewerProjectName') : null) || ''
    let baseName = projectName.trim() || shareTitle
      .replace(/\.pdf$/i, '')
      .replace(/_?\d{4}-\d{2}-\d{2}(T[^_]*)?$/, '') // YYYY-MM-DD или с временем
      .replace(/_?\d{2}-\d{2}-\d{4}$/, '') // уже ДД-ММ-ГГГГ в имени
    baseName = baseName.replace(/[\\/:*?"<>|]+/g, '').trim() || 'document'
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const nameForShare = `${baseName}_${dd}-${mm}-${yyyy}.pdf`
    const shareSubject = `Расчёт по проекту — ${baseName}`
    const shareText = 'Во вложении расчёт по проекту. Сформировано в приложении Groxy. Скачать приложение: https://www.rustore.ru/catalog/app/com.groxy.app'

    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const { Share } = await import('@capacitor/share')
        const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')

        // Capacitor Share на Android принимает только file:// или http(s). Передаём file:// + path.
        let shareUrl: string | null = null

        if (pdfData) {
          const binary = atob(pdfData)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const result = await savePdfToDevice(nameForShare, bytes)
          if (result) {
            shareUrl = typeof result === 'string' ? result : (result.path ? `file://${result.path}` : result.uri)
          }
        } else {
          const nativeStorage = (window as Window & { NativeStorage?: { getPdfBase64: (name: string) => string; listPdfs: () => string } }).NativeStorage
          if (nativeStorage && typeof nativeStorage.getPdfBase64 === 'function') {
            const base64Result = nativeStorage.getPdfBase64(shareTitle)
            if (base64Result && !base64Result.includes('error') && !base64Result.startsWith('{')) {
              const binary = atob(base64Result)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              const result = await savePdfToDevice(nameForShare, bytes)
              if (result) {
                shareUrl = typeof result === 'string' ? result : (result.path ? `file://${result.path}` : result.uri)
              }
            }
          }
        }

        if (shareUrl && (shareUrl.startsWith('file://') || shareUrl.startsWith('http'))) {
          await Share.share({
            title: shareSubject,
            text: shareText,
            url: shareUrl,
            dialogTitle: 'Поделиться PDF',
          })
          return
        }

        alert('Не удалось подготовить файл для шаринга')
        return
      }

      if (Capacitor.isNativePlatform()) {
        // iOS или другая платформа
        const { Share } = await import('@capacitor/share')
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        if (pdfData) {
          const cachePath = `Groxy/share/${nameForShare}`
          await Filesystem.writeFile({
            path: cachePath,
            data: pdfData,
            directory: Directory.Cache,
          })
          const fileUri = await Filesystem.getUri({
            path: cachePath,
            directory: Directory.Cache,
          })
          await Share.share({
            title: shareSubject,
            text: shareText,
            url: fileUri.uri,
            dialogTitle: 'Поделиться PDF',
          })
          return
        }
        alert('Не удалось подготовить файл для шаринга')
        return
      }

      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        if (pdfData) {
          const binary = atob(pdfData)
          const len = binary.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: 'application/pdf' })
          const file = new File([blob], nameForShare, { type: 'application/pdf' })
          await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ title: shareSubject, text: shareText, files: [file] })
          return
        }
        if (pdfUri) {
          await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ title: shareSubject, text: shareText, url: pdfUri })
          return
        }
      }

      if (pdfUri && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pdfUri)
        alert('Ссылка на PDF скопирована')
        return
      }

      alert('Поделиться не поддерживается на этом устройстве')
    } catch (err: unknown) {
      console.error('Ошибка при шаринге PDF:', err)
      const message = err instanceof Error ? err.message : String(err)
      alert(`Не удалось поделиться PDF: ${message}`)
    }
  }

  // Для веб-версии используем стандартный подход
  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      <header className="border-b border-white/10">
        <div className="mx-auto w-full px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400 truncate max-w-xs">{filename}</span>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <PdfViewer
          pdfData={pdfData || undefined}
          pdfUrl={pdfData ? undefined : (pdfUri || undefined)}
          filename={filename}
          onClose={goBack}
          onShare={handleShare}
        />
      </main>
    </div>
  )
}

export default function PdfViewerPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <p className="text-zinc-400">Загрузка...</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <p className="text-zinc-400">Загрузка PDF...</p>
        </main>
      </div>
    }>
      <PdfViewerContent />
    </Suspense>
  )
}

