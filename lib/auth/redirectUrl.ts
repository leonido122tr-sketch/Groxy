/**
 * URL, на который Supabase редиректит после OAuth (Google и др.).
 * В браузере — origin + /auth/callback; в нативном приложении (APK) — custom scheme,
 * иначе на телефоне попадёт localhost и вход не завершится.
 */
export const AUTH_CALLBACK_SCHEME = 'com.groxy.app://auth/callback'

export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return ''
  const Cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  if (Cap?.isNativePlatform?.()) return AUTH_CALLBACK_SCHEME
  return `${window.location.origin}/auth/callback`
}

/**
 * URL страницы Supabase Auth, которая редиректит на Google (accounts.google.com).
 * apikey нужен, чтобы hosted Supabase принял запрос из внешнего браузера.
 */
export function getGoogleAuthAuthorizeUrl(
  supabaseUrl: string,
  redirectTo: string,
  anonKey: string
): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: redirectTo,
    apikey: anonKey,
  })
  return `${base}/auth/v1/authorize?${params.toString()}`
}
