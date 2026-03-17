import imageCompression from 'browser-image-compression'
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'forum-images'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB — лимит исходного файла
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** На нативе (Android/iOS) Web Worker может быть недоступен — сжимаем в главном потоке */
async function getCompressOptions(): Promise<Parameters<typeof imageCompression>[1]> {
  let useWebWorker = true
  if (typeof window !== 'undefined') {
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) useWebWorker = false
    } catch {
      // Capacitor не подключён — веб, оставляем worker
    }
  }
  return {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker,
    initialQuality: 0.85,
    fileType: 'image/jpeg' as const,
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

/**
 * Сжимает изображение на клиенте, затем загружает в forum-images. Возвращает публичный URL.
 * Исходный файл не более 5 МБ; после сжатия объём значительно меньше.
 */
export async function uploadForumImage(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Разрешены только изображения: JPG, PNG, GIF, WebP.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Размер файла не более 5 МБ.')
  }

  let blob: File = file
  try {
    const options = await getCompressOptions()
    blob = await imageCompression(file, options)
  } catch (e) {
    console.warn('Сжатие не удалось, загружаем исходный файл:', e)
  }

  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, '')) || 'image'
  const path = `${userId}/${Date.now()}-${safeName}.jpg`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: blob.type,
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
