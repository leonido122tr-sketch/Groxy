'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

function PdfViewerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pdfUri, setPdfUri] = useState<string | null>(null)
  const [pdfData, setPdfData] = useState<string | null>(null) // base64 data
  const [filename, setFilename] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('PdfViewerPage: useEffect вызван')
    
    const loadPdf = async () => {
      try {
        console.log('PdfViewerPage: loadPdf вызван')
        
        // Сначала проверяем параметры URL
        const uriParam = searchParams.get('uri')
        const filenameParam = searchParams.get('filename')
        console.log('PdfViewerPage: URL параметры:', { uriParam, filenameParam })
        
        // Затем проверяем sessionStorage
        const uri = uriParam || sessionStorage.getItem('pdfViewerUri')
        const name = filenameParam || sessionStorage.getItem('pdfViewerFilename') || 'document.pdf'
        console.log('PdfViewerPage: URI из sessionStorage:', uri ? 'найден' : 'не найден')
        console.log('PdfViewerPage: filename:', name)

        if (!uri) {
          console.error('PdfViewerPage: PDF файл не найден')
          setError('PDF файл не найден')
          setLoading(false)
          return
        }

        setFilename(name)

        // На Android нужно использовать другой подход для загрузки PDF
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          // Для Android читаем файл через JavaScript Interface и конвертируем в base64
          const nativeStorage = (window as any).NativeStorage
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
      } catch (err: any) {
        console.error('Ошибка загрузки PDF:', err)
        setError('Ошибка загрузки PDF: ' + (err.message || 'Неизвестная ошибка'))
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
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              ← Назад
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
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              ← Назад
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <p className="text-zinc-400">Загрузка PDF...</p>
        </main>
      </div>
    )
  }

  // На Android используем iframe для отображения PDF
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return (
      <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
        <header className="border-b border-white/10">
          <div className="mx-auto w-full px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                ← Назад
              </button>
              <h1 className="text-lg font-semibold truncate max-w-xs">{filename}</h1>
              <div className="w-20"></div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <iframe
            src={pdfUri}
            className="w-full h-full border-0"
            title={filename}
            style={{ minHeight: '100%' }}
          />
        </main>
      </div>
    )
  }

  // Для веб-версии используем стандартный подход
  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      <header className="border-b border-white/10">
        <div className="mx-auto w-full px-4 py-4 sm:px-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            ← Назад
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <iframe
          src={pdfUri}
          className="w-full h-full border-0"
          title={filename}
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

