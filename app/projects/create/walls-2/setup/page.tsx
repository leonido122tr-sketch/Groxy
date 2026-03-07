'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Редирект на страницу параметров (главную страницу настройки проекта)
    router.replace('/projects/create/walls-2/parameters')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white pt-safe">
      <p className="text-zinc-400">Перенаправление...</p>
    </div>
  )
}
