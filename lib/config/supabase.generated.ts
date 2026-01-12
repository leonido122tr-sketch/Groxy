// Этот файл генерируется автоматически из .env.local
// НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ

// Встроенные значения из .env.local
export const SUPABASE_URL: string = "https://rqxhbxmcwmpzlslukzkq.supabase.co";
export const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxeGhieG1jd21wemxzbHVremtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzE2MjksImV4cCI6MjA4Mjg0NzYyOX0.4KMqX9fsT2fEs8EWu6KUD3mHI_DK6RPIZlEJ-80O1Zo";

export function getSupabaseConfig() {
  if (typeof window !== 'undefined') {
    // Проверяем глобальную конфигурацию
    const globalConfig = (window as any).__SUPABASE_CONFIG__;
    if (globalConfig?.url && globalConfig?.key) {
      return {
        url: globalConfig.url,
        key: globalConfig.key,
      };
    }
  }
  
  return {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
  };
}
