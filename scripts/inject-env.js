// Скрипт для встраивания переменных окружения в конфигурационный файл
const fs = require('fs');
const path = require('path');

// Читаем .env.local
const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmed.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

// Если не найдены в .env.local, пробуем из process.env (для CI/CD)
if (!supabaseUrl) {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}
if (!supabaseKey) {
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

// Создаем конфигурационный файл с встроенными значениями
const configContent = `// Этот файл генерируется автоматически из .env.local
// НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ

// Встроенные значения из .env.local
export const SUPABASE_URL: string = ${JSON.stringify(supabaseUrl)};
export const SUPABASE_ANON_KEY: string = ${JSON.stringify(supabaseKey)};

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
`;

// Записываем TypeScript файл
const configPath = path.join(process.cwd(), 'lib', 'config', 'supabase.generated.ts');
fs.writeFileSync(configPath, configContent, 'utf8');

// Также создаем JavaScript файл для встраивания в сборку
const jsConfigContent = `// Этот файл генерируется автоматически из .env.local
// НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ

// Встроенные значения (встраиваются в бандл во время сборки)
export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseKey)};

export function getSupabaseConfig() {
  if (typeof window !== 'undefined') {
    const globalConfig = window.__SUPABASE_CONFIG__;
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
`;

const jsConfigPath = path.join(process.cwd(), 'lib', 'config', 'supabase.generated.js');
fs.writeFileSync(jsConfigPath, jsConfigContent, 'utf8');

console.log('✅ Конфигурация Supabase встроена в lib/config/supabase.generated.ts и .js');
console.log(`   URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'НЕ НАЙДЕН'}`);
console.log(`   Key: ${supabaseKey ? 'НАЙДЕН (' + supabaseKey.length + ' символов)' : 'НЕ НАЙДЕН'}`);

