'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogoutButton } from './LogoutButton'

export function AppHeader() {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard'

  return (
    <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl transition-colors hover:bg-white/5 -m-2 p-2"
            aria-label="На главную"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 overflow-hidden">
              <Image
                src="/logo.png"
                alt="Groxy Logo"
                width={32}
                height={32}
                className="h-9 w-9 object-contain rounded-full"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Groxy
            </h1>
          </Link>
          {isDashboard && (
            <div className="flex items-center gap-3">
              <Link
                href="/profile/setup"
                className="glass rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/15"
              >
                <span className="hidden sm:inline">Профиль</span>
                <svg className="h-5 w-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
