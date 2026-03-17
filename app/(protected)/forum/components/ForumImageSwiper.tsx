'use client'

import { useState, useCallback, useEffect } from 'react'

const SWIPE_THRESHOLD = 40
const imageFigureClass = 'max-w-full rounded-xl border border-white/10 object-contain max-h-[280px] w-auto select-none touch-none'

type Props = {
  urls: string[]
  className?: string
  imageClassName?: string
  onRemoveUrl?: (url: string) => void
  /** Превью при загрузке: меньший размер */
  compact?: boolean
}

export function ForumImageSwiper({ urls, className = '', imageClassName = '', onRemoveUrl, compact }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % urls.length)
  }, [urls.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + urls.length) % urls.length)
  }, [urls.length])

  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(0, urls.length - 1)))
  }, [urls.length])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setStartX(e.clientX)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      if (startX === null) return
      const delta = e.clientX - startX
      if (delta < -SWIPE_THRESHOLD) goNext()
      else if (delta > SWIPE_THRESHOLD) goPrev()
      setStartX(null)
    },
    [startX, goNext, goPrev]
  )

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    setStartX(null)
  }, [])

  if (urls.length === 0) return null
  if (urls.length === 1) {
    return (
      <div className={className}>
        <figure className="flex justify-center">
          <img
            src={urls[0]}
            alt=""
            className={compact ? 'h-20 w-20 rounded-2xl border border-white/10 object-contain' : imageFigureClass + ' ' + imageClassName}
          />
        </figure>
        {onRemoveUrl && (
          <button
            type="button"
            onClick={() => onRemoveUrl(urls[0])}
            className="mt-1 text-xs text-zinc-500 hover:text-red-400"
          >
            Удалить фото
          </button>
        )}
      </div>
    )
  }

  const slideWidthPercent = 100 / urls.length

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden rounded-xl min-h-[120px]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        style={{ touchAction: 'pan-y' }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            width: `${urls.length * 100}%`,
            transform: `translateX(-${currentIndex * slideWidthPercent}%)`,
          }}
        >
          {urls.map((url, i) => (
            <figure
              key={i}
              className="flex shrink-0 justify-center items-center"
              style={{ width: `${slideWidthPercent}%` }}
            >
              <img
                src={url}
                alt=""
                className={
                  compact
                    ? 'h-20 w-20 rounded-2xl border border-white/10 object-contain select-none touch-none'
                    : imageFigureClass + ' ' + imageClassName
                }
                draggable={false}
              />
            </figure>
          ))}
        </div>
        {onRemoveUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemoveUrl(urls[currentIndex])
              setCurrentIndex((i) => Math.min(i, Math.max(0, urls.length - 2)))
            }}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-500"
            aria-label="Удалить фото"
          >
            ×
          </button>
        )}
      </div>
      <p className="mt-1 text-center text-xs text-zinc-500">
        Свайп влево/вправо по фото · {currentIndex + 1} / {urls.length}
      </p>
    </div>
  )
}
