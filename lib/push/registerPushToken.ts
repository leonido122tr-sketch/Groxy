/**
 * Регистрация FCM/APNS токена и сохранение в Supabase (push_tokens).
 * Вызывать только на нативной платформе (Capacitor), после входа пользователя.
 *
 * Для Android нужен google-services.json в android/app/ и проект Firebase с Cloud Messaging.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const PLATFORM_ANDROID = 'android'
const PLATFORM_IOS = 'ios'

export type RegisterPushTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'not_native' | 'permission_denied' | 'register_error' | 'save_error'; error?: string }

/**
 * Запрашивает разрешение, регистрирует push, при получении токена сохраняет его в push_tokens.
 * Использует текущую сессию Supabase (user_id берётся из БД по сессии или передаётся явно).
 */
export async function registerPushToken(
  supabase: SupabaseClient,
  userId: string
): Promise<RegisterPushTokenResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'not_native' }

  const Cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
    .Capacitor
  if (!Cap?.isNativePlatform?.()) return { ok: false, reason: 'not_native' }

  const platform = Cap.getPlatform?.() === 'ios' ? PLATFORM_IOS : PLATFORM_ANDROID

  const { PushNotifications } = await import('@capacitor/push-notifications')

  return new Promise((resolve) => {
    const onRegistration = async (token: { value: string }) => {
      try {
        const { error } = await supabase.from('push_tokens').upsert(
          { user_id: userId, token: token.value, platform },
          { onConflict: 'user_id,token' }
        )
        if (error) {
          console.warn('[push] Failed to save token:', error)
          resolve({ ok: false, reason: 'save_error', error: error.message })
          return
        }
        resolve({ ok: true, token: token.value })
      } catch (e) {
        console.warn('[push] Save token error:', e)
        resolve({ ok: false, reason: 'save_error', error: String(e) })
      }
    }

    const onRegistrationError = (err: { error: string }) => {
      console.warn('[push] Registration error:', err.error)
      resolve({ ok: false, reason: 'register_error', error: err.error })
    }

    let resolved = false
    const finish = (r: RegisterPushTokenResult) => {
      if (resolved) return
      resolved = true
      Promise.all([regHandle?.remove(), errHandle?.remove()]).catch(() => {})
      resolve(r)
    }

    let regHandle: { remove: () => Promise<void> } | undefined
    let errHandle: { remove: () => Promise<void> } | undefined

    PushNotifications.addListener('registration', (t) => {
      onRegistration(t).then(finish)
    })
      .then((h) => {
        regHandle = h
      })
      .catch(() => {})

    PushNotifications.addListener('registrationError', (e) => {
      finish({ ok: false, reason: 'register_error', error: e.error })
    })
      .then((h) => {
        errHandle = h
      })
      .catch(() => {})

    PushNotifications.checkPermissions()
      .then((status) => {
        if (status.receive === 'granted') {
          PushNotifications.register().catch((e) => {
            finish({ ok: false, reason: 'register_error', error: String(e) })
          })
          return
        }
        if (status.receive === 'denied') {
          finish({ ok: false, reason: 'permission_denied' })
          return
        }
        return PushNotifications.requestPermissions()
      })
      .then((status?) => {
        if (!resolved && status?.receive === 'granted') {
          PushNotifications.register().catch((e) => {
            finish({ ok: false, reason: 'register_error', error: String(e) })
          })
        } else if (!resolved && status?.receive === 'denied') {
          finish({ ok: false, reason: 'permission_denied' })
        }
      })
      .catch((e) => {
        if (!resolved) finish({ ok: false, reason: 'register_error', error: String(e) })
      })
  })
}
