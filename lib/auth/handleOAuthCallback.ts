import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { createClient } from '@/lib/supabase/client'
import { Browser } from '@capacitor/browser'

/**
 * Обмен code на сессию, upsert профиля, закрытие браузера (если открыт), редирект в dashboard или login.
 * Используется при открытии приложения по deep link (OAuth callback).
 */
export async function handleOAuthCallbackUrl(url: string, router: AppRouterInstance): Promise<boolean> {
  if (!url?.includes('auth/callback') || !url?.includes('code=')) return false
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(url)
    if (error) {
      console.error('OAuth exchange (deep link):', error)
      router.push('/login')
      return true
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        await supabase.from('profiles').upsert(
          {
            идентификатор: user.id,
            электронная_почта: user.email ?? '',
            отображаемое_имя:
              (user.user_metadata?.full_name as string | undefined)?.trim() ||
              (user.user_metadata?.name as string | undefined)?.trim() ||
              null,
            обновлено_в: new Date().toISOString(),
          },
          { onConflict: 'идентификатор' }
        )
      } catch {
        // ignore
      }
    }
    await Browser.close().catch(() => {})
    router.push('/dashboard')
    router.refresh()
    return true
  } catch (e) {
    console.error('Deep link auth:', e)
    router.push('/login')
    return true
  }
}
