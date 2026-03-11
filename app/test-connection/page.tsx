'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BackButton } from '@/app/components/BackButton'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'

export default function TestConnectionPage() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const testConnection = async () => {
    setStatus('testing')
    setMessage('Проверка подключения...')

    try {
      const { error } = await supabase.from('_test').select('*').limit(1)

      if (error) {
        // Это нормально, если таблицы нет - значит подключение работает
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          setStatus('success')
          setMessage('✅ Подключение к Supabase работает! (Таблица _test не существует, но это нормально)')
        } else {
          throw error
        }
      } else {
        setStatus('success')
        setMessage('✅ Подключение к Supabase работает!')
      }
    } catch (error: unknown) {
      setStatus('error')
      const msg = error instanceof Error ? error.message : String(error)
      setMessage(`❌ Ошибка: ${msg || 'Не удалось подключиться к Supabase'}`)
    }
  }

  return (
    <AppPage width="sm" className="justify-center py-6">
      <SurfaceCard className="p-6">
        <h1 className="mb-6 text-2xl font-semibold text-white">
          Тест подключения
        </h1>

        <div className="space-y-4">
          <button
            onClick={testConnection}
            disabled={status === 'testing'}
            className="btn-primary disabled:opacity-50"
          >
            {status === 'testing' ? 'Проверка...' : 'Проверить подключение'}
          </button>

          {message && (
            <div
              className={`rounded-2xl p-4 text-sm ${
                status === 'success'
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : status === 'error'
                  ? 'border border-red-500/30 bg-red-500/10 text-red-200'
                  : 'android-panel-soft text-zinc-300'
              }`}
            >
              {message}
            </div>
          )}

          <div className="android-panel-soft mt-6 p-4 text-sm">
            <p className="mb-2 font-medium text-white">
              Переменные окружения:
            </p>
            <p className="text-zinc-400">
              NEXT_PUBLIC_SUPABASE_URL:{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Установлен' : '❌ Не установлен'}
            </p>
            <p className="text-zinc-400">
              NEXT_PUBLIC_SUPABASE_ANON_KEY:{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Установлен' : '❌ Не установлен'}
            </p>
          </div>
        </div>

        <p className="mt-6 text-center">
          <BackButton
            fallbackHref="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl px-3 text-sm text-zinc-300"
          >
            ← На главную
          </BackButton>
        </p>
      </SurfaceCard>
    </AppPage>
  )
}

