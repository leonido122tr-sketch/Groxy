'use client'

import { useRouter } from 'next/navigation'
import { LogoutIcon } from './AppIcons'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Выйти"
      className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-2xl bg-[#2a1820] px-3 py-2.5 text-sm font-medium text-red-200"
    >
      <LogoutIcon className="h-4 w-4" />
      <span className="hidden md:inline">Выйти</span>
    </button>
  )
}

