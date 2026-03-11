/**
 * Хранилище для Supabase Auth в нативном приложении (Capacitor).
 * Использует Preferences, чтобы code_verifier и сессия сохранялись при перезапуске приложения
 * (когда пользователь возвращается из браузера по deep link).
 */

const PREFIX = 'supabase_auth_'

async function getPref(key: string): Promise<string | undefined> {
  const { Preferences } = await import('@capacitor/preferences')
  const { value } = await Preferences.get({ key: PREFIX + key })
  return value ?? undefined
}

async function setPref(key: string, value: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.set({ key: PREFIX + key, value })
}

async function removePref(key: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.remove({ key: PREFIX + key })
}

/**
 * Методы cookie для @supabase/ssr createBrowserClient (deprecated API).
 * Используется только когда Capacitor.isNativePlatform() === true.
 * Хранилище переживает перезапуск приложения (Preferences), поэтому code_verifier
 * доступен при возврате из браузера по deep link.
 */
export function getNativeAuthCookieMethods(): {
  get: (name: string) => Promise<string | null | undefined>
  set: (name: string, value: string, _options?: object) => Promise<void>
  remove: (name: string, _options?: object) => Promise<void>
} {
  return {
    get: (name: string) => getPref(name).then((v) => v ?? null),
    set: (name: string, value: string) => setPref(name, value),
    remove: (name: string) => removePref(name),
  }
}
