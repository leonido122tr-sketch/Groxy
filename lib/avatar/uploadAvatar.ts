import imageCompression from 'browser-image-compression'
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'avatars'
const MAX_SIZE_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const COMPRESS_OPTIONS = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  initialQuality: 0.85,
  fileType: 'image/jpeg' as const,
}

const AVATAR_EXPIRY_SEC = 3600 // 1 час для подписанного URL (приватный бакет)

/**
 * Сжимает фото и загружает в avatars/{userId}/avatar.jpg.
 * Возвращает путь для сохранения в профиле (приватный бакет — показ через createSignedUrl).
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Разрешены только изображения: JPG, PNG, GIF, WebP.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Размер файла не более 3 МБ.')
  }

  let blob: File = file
  try {
    blob = await imageCompression(file, COMPRESS_OPTIONS)
  } catch (e) {
    console.warn('Сжатие аватара не удалось, загружаем исходный файл:', e)
  }

  const path = `${userId}/avatar.jpg`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: true,
    contentType: blob.type,
  })

  if (error) throw new Error(error.message)

  return path
}

/**
 * Возвращает URL для отображения аватара. В профиле хранится путь (userId/avatar.jpg);
 * для приватного бакета выдаёт подписанный URL, для старых записей с полным URL — возвращает как есть.
 */
export async function getAvatarDisplayUrl(
  supabase: SupabaseClient,
  avatarValue: string | null | undefined
): Promise<string | null> {
  if (!avatarValue?.trim()) return null
  const v = avatarValue.trim()
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(v, AVATAR_EXPIRY_SEC)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
