'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadForumImage } from '@/lib/forum/uploadForumImage'
import type { User } from '@supabase/supabase-js'

type Props = {
  user: User
  imageUrls: string[]
  onInsertUrl: (url: string) => void
  onRemoveUrl?: (url: string) => void
  disabled?: boolean
}

export function ForumImageUpload({ user, imageUrls, onInsertUrl, onRemoveUrl, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const url = await uploadForumImage(supabase, file, user.id)
      onInsertUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFile}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {uploading ? 'Загрузка…' : 'Добавить фото'}
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url) => (
            <div key={url} className="relative shrink-0">
              <img
                src={url}
                alt=""
                className="h-16 w-16 rounded-lg border border-white/10 object-cover"
              />
              {onRemoveUrl && (
                <button
                  type="button"
                  onClick={() => onRemoveUrl(url)}
                  disabled={disabled}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50"
                  aria-label="Удалить фото"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
