'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TestConnectionPage() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const testConnection = async () => {
    setStatus('testing')
    setMessage('Проверка подключения...')

    try {
      const { data, error } = await supabase.from('_test').select('*').limit(1)

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
    } catch (error: any) {
      setStatus('error')
      setMessage(`❌ Ошибка: ${error.message || 'Не удалось подключиться к Supabase'}`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <h1 className="mb-6 text-3xl font-bold text-black dark:text-zinc-50">
          Тест подключения
        </h1>

        <div className="space-y-4">
          <button
            onClick={testConnection}
            disabled={status === 'testing'}
            className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {status === 'testing' ? 'Проверка...' : 'Проверить подключение'}
          </button>

          {message && (
            <div
              className={`rounded-lg p-4 text-sm ${
                status === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : status === 'error'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-6 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800">
            <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">
              Переменные окружения:
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              NEXT_PUBLIC_SUPABASE_URL:{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Установлен' : '❌ Не установлен'}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              NEXT_PUBLIC_SUPABASE_ANON_KEY:{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Установлен' : '❌ Не установлен'}
            </p>
          </div>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            ← На главную
          </Link>
        </p>
      </main>
    </div>
  )
}

