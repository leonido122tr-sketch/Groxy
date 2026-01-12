// Конфигурация Supabase для клиентского использования
// Этот файл используется вместо переменных окружения в статическом экспорте

// Импортируем сгенерированный файл с встроенными значениями
// Используем динамический импорт для гарантированного получения значений
let GENERATED_URL = ''
let GENERATED_KEY = ''

// Синхронный импорт для встраивания в бандл
try {
  const generated = require('./supabase.generated')
  GENERATED_URL = generated.SUPABASE_URL || ''
  GENERATED_KEY = generated.SUPABASE_ANON_KEY || ''
} catch (e) {
  // Игнорируем ошибку импорта
  console.warn('Не удалось загрузить сгенерированную конфигурацию:', e)
}

// Используем встроенные значения или переменные окружения
export const SUPABASE_URL = GENERATED_URL || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL : '')
export const SUPABASE_ANON_KEY = GENERATED_KEY || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '')

// Если переменные окружения не доступны (например, в статическом экспорте),
// можно попробовать получить из window (если установлено в runtime)
export function getSupabaseConfig() {
  if (typeof window !== 'undefined') {
    // Проверяем глобальную конфигурацию
    const globalConfig = (window as any).__SUPABASE_CONFIG__
    if (globalConfig?.url && globalConfig?.key) {
      return {
        url: globalConfig.url,
        key: globalConfig.key,
      }
    }
  }
  
  return {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
  }
}

