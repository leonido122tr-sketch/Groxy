'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadForumImage } from '@/lib/forum/uploadForumImage'
import { ForumImageSwiper } from './ForumImageSwiper'
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
    e.target.value = ''
    if (!file) return
    if (imageUrls.length >= 5) return
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const url = await uploadForumImage(supabase, file, user.id)
      if (imageUrls.length < 5) onInsertUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото.')
    } finally {
      setUploading(false)
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
          disabled={disabled || uploading || imageUrls.length >= 5}
          className="android-btn-secondary text-sm text-zinc-300 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Загрузка…' : imageUrls.length >= 5 ? 'Не более 5 фото' : 'Добавить фото'}
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
      {imageUrls.length > 0 && (
        <ForumImageSwiper
          urls={imageUrls}
          compact
          onRemoveUrl={disabled ? undefined : onRemoveUrl}
        />
      )}
    </div>
  )
}
