'use client'

/**
 * Превью прикреплённых фото в форме темы/ответа.
 * 1–2: в ряд. 3: два сверху, одно снизу крупнее. 4: 2×2. 5: два сверху, два снизу, одно под ними крупнее.
 */
export function ForumImagePreviewGrid({
  urls,
  onRemove,
  disabled,
  className = '',
}: {
  urls: string[]
  onRemove: (url: string) => void
  disabled?: boolean
  className?: string
}) {
  if (urls.length === 0) return null

  const isBig = (index: number) => {
    if (urls.length === 3) return index === 2
    if (urls.length === 5) return index === 4
    return false
  }

  return (
    <div className={`grid max-w-[200px] grid-cols-2 gap-2 ${className}`}>
      {urls.map((url, index) => (
        <div
          key={url}
          className={`relative flex min-h-[80px] items-center justify-center overflow-hidden ${
            isBig(index) ? 'col-span-2' : ''
          }`}
        >
          <img
            src={url}
            alt=""
            className="max-h-[140px] max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => onRemove(url)}
            disabled={disabled}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50"
            aria-label="Удалить"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
