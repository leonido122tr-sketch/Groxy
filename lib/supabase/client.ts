import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/lib/config/supabase'

// Получаем URL и ключ из различных источников
function getSupabaseUrl(): string {
  // 1. Попробуем получить из window (может быть установлено в runtime)
  if (typeof window !== 'undefined') {
    // Проверяем глобальную конфигурацию
    const globalConfig = (window as any).__SUPABASE_CONFIG__
    if (globalConfig?.url) {
      return globalConfig.url
    }
    
    // Проверяем capacitorConfig (для совместимости)
    const capacitorConfig = (window as any).capacitorConfig
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
      hasGlobalConfig: typeof window !== 'undefined' && !!(window as any).__SUPABASE_CONFIG__,
      hasProcessEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    })
    throw new Error('Конфигурация Supabase не найдена. Проверьте переменные окружения или настройки приложения.')
  }
  return url
}

function getSupabaseKey(): string {
  // 1. Попробуем получить из window (может быть установлено в runtime)
  if (typeof window !== 'undefined') {
    const globalConfig = (window as any).__SUPABASE_CONFIG__
    if (globalConfig?.key) {
      return globalConfig.key
    }
    
    const capacitorConfig = (window as any).capacitorConfig
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

export function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  
  console.log('Создание Supabase клиента:', { 
    url: url ? url.substring(0, 30) + '...' : 'ПУСТО', 
    hasKey: !!key,
    urlLength: url ? url.length : 0,
    keyLength: key ? key.length : 0,
    urlFull: url ? url : 'НЕТ URL',
    keyPreview: key ? key.substring(0, 20) + '...' : 'НЕТ KEY'
  })
  
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
  
  return createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  })
}

