import type { NextConfig } from "next";
import * as fs from 'fs';
import * as path from 'path';

// Читаем переменные окружения из .env.local для встраивания в код
function getEnvVars() {
  const envPath = path.join(process.cwd(), '.env.local');
  const vars: Record<string, string> = {};
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && value) {
          vars[key] = value;
        }
      }
    }
  }
  
  return vars;
}

const envVars = getEnvVars();

const nextConfig: NextConfig = {
  // Required for Capacitor: it serves a static folder (webDir) from `out/`
  // so we must build a static export.
  output: 'export',
  // Static export cannot use Next Image optimization.
  images: { unoptimized: true },
  // Встраиваем переменные окружения в код
  env: {
    NEXT_PUBLIC_SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
};

export default nextConfig;
