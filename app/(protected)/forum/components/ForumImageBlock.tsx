'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  urls: string[]
  className?: string
}

/** Крупное фото: при 3 — третье, при 5 — пятое (col-span-2 снизу). */
function isBigCell(length: number, index: number): boolean {
  return (length === 3 && index === 2) || (length === 5 && index === 4)
}

export function ForumImageBlock({ urls, className = '' }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? 0 : (i - 1 + urls.length) % urls.length))
  }, [urls.length])

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i === null ? 0 : (i + 1) % urls.length))
  }, [urls.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightboxIndex, closeLightbox, goPrev, goNext])

  if (urls.length === 0) return null

  return (
    <>
      <div
        className={`mb-3 grid w-full max-w-[280px] grid-cols-2 gap-1.5 border border-white/10 bg-[#0d1117]/60 p-1.5 ${className}`}
      >
        {urls.map((url, i) => (
          <button
            key={`${i}-${url}`}
            type="button"
            onClick={() => openLightbox(i)}
            className={`focus:outline-none focus:ring-2 focus:ring-blue-500/30 flex min-h-[60px] items-center justify-center overflow-hidden ${
              isBigCell(urls.length, i) ? 'col-span-2' : ''
            }`}
          >
            <img
              src={url}
              alt=""
              className="max-h-[180px] max-w-full object-contain bg-[#141a22]"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Закрыть"
          >
            <X className="h-6 w-6" />
          </button>

          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Предыдущее"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Следующее"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <img
            src={urls[lightboxIndex]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {urls.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
              {lightboxIndex + 1} / {urls.length}
            </span>
          )}
        </div>
      )}
    </>
  )
}
