import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/lib/config/supabase'
import { getNativeAuthCookieMethods } from '@/lib/auth/nativeStorage'

/** Сетевая ошибка при обращении к Supabase (нет связи, CORS, таймаут). Не меняем URL/ключи — только обрабатываем отказ сети. */
export function isSupabaseNetworkError(err: unknown): boolean {
  if (!err) return false
  const msg = err instanceof Error ? err.message : String(err)
  const name = err instanceof Error ? (err as Error & { name?: string }).name : ''
  return (
    msg === 'Failed to fetch' ||
    (typeof msg === 'string' && msg.toLowerCase().includes('failed to fetch')) ||
    name === 'AuthRetryableFetchError'
  )
}

// Получаем URL и ключ из различных источников
function getSupabaseUrl(): string {
  // 1. Попробуем получить из window (может быть установлено в runtime)
  if (typeof window !== 'undefined') {
    // Проверяем глобальную конфигурацию
    const globalConfig = (window as Window & { __SUPABASE_CONFIG__?: { url?: string; key?: string } }).__SUPABASE_CONFIG__
    if (globalConfig?.url) {
      return globalConfig.url
    }
    
    // Проверяем capacitorConfig (для совместимости)
    const capacitorConfig = (window as Window & { capacitorConfig?: { supabaseUrl?: string; supabaseAnonKey?: string } }).capacitorConfig
    if (capacitorConfig?.supabaseUrl) {
      return capacitorConfig.supabaseUrl
    }
  }
  
  // 2. Используем конфигурацию из lib/config/supabase.ts
  const config = getSupabaseConfig()
  if (config.url) {
    return config.url
  }
  
  // 3. Fallback на переменные окружения
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.error('NEXT_PUBLIC_SUPABASE_URL не установлен!')
    console.error('Доступные источники:', {
      hasWindow: typeof window !== 'undefined',
      hasGlobalConfig: typeof window !== 'undefined' && !!(window as Window & { __SUPABASE_CONFIG__?: unknown }).__SUPABASE_CONFIG__,
      hasProcessEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    })
    throw new Error('Конфигурация Supabase не найдена. Проверьте переменные окружения или настройки приложения.')
  }
  return url
}

function getSupabaseKey(): string {
  // 1. Попробуем получить из window (может быть установлено в runtime)
  if (typeof window !== 'undefined') {
    const globalConfig = (window as Window & { __SUPABASE_CONFIG__?: { url?: string; key?: string } }).__SUPABASE_CONFIG__
    if (globalConfig?.key) {
      return globalConfig.key
    }
    
    const capacitorConfig = (window as Window & { capacitorConfig?: { supabaseUrl?: string; supabaseAnonKey?: string } }).capacitorConfig
    if (capacitorConfig?.supabaseAnonKey) {
      return capacitorConfig.supabaseAnonKey
    }
  }
  
  // 2. Используем конфигурацию из lib/config/supabase.ts
  const config = getSupabaseConfig()
  if (config.key) {
    return config.key
  }
  
  // 3. Fallback на переменные окружения
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY не установлен!')
    throw new Error('Конфигурация Supabase не найдена. Проверьте переменные окружения или настройки приложения.')
  }
  return key
}

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return cap?.isNativePlatform?.() === true
}

export function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  
  if (!url || !key) {
    const errorMsg = `Не удалось получить конфигурацию Supabase. URL: ${url ? 'есть' : 'ОТСУТСТВУЕТ'}, Key: ${key ? 'есть' : 'ОТСУТСТВУЕТ'}`
    console.error(errorMsg)
    console.error('Детали конфигурации:', {
      config: getSupabaseConfig(),
      processEnvUrl: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'process недоступен',
      processEnvKey: typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'есть' : 'нет') : 'process недоступен',
    })
    throw new Error(errorMsg)
  }

  const authOptions = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
  }

  if (typeof window !== 'undefined' && isNativePlatform()) {
    return createBrowserClient(url, key, {
      auth: authOptions,
      cookies: getNativeAuthCookieMethods(),
    })
  }
  
  return createBrowserClient(url, key, {
    auth: {
      ...authOptions,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  })
}

