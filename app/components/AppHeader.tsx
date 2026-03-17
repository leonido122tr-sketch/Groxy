'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { DashboardIcon, ProfileIcon, ProjectsIcon } from './AppIcons'
import { LogoutButton } from './LogoutButton'
import { NotificationDrawer } from './NotificationDrawer'
import { useAuth } from '@/lib/auth/AuthContext'
import { useForumNotificationCount } from '@/lib/forum/useForumNotificationCount'

export function AppHeader() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { count: notificationCount } = useForumNotificationCount(user?.id)
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false)
  const isDashboard = pathname === '/dashboard'
  const isProjectsArea = pathname?.startsWith('/projects')
  const isProjectLibrary = pathname === '/project'
  const isProfile = pathname === '/profile/setup'
  const locationLabel = isProjectsArea
    ? 'Проекты'
    : isDashboard
      ? 'Центр управления'
      : 'Платформа'
  const navItemClass = (active: boolean) =>
    `inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
      active
        ? 'bg-[#2f6fed] text-white shadow-[0_6px_18px_rgba(47,111,237,0.28)]'
        : 'bg-[#1a2230] text-zinc-200'
    }`

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(16,22,31,0.92)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="-m-1 flex min-h-12 items-center gap-3 rounded-2xl p-1"
            aria-label="На главную"
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#1a2230]">
              <Image
                src="/logo.png"
                alt="Groxy Logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-2xl object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                Groxy
              </h1>
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.1em] text-zinc-400">
                {locationLabel}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotificationDrawerOpen(true)}
                className={`relative flex min-h-12 min-w-12 items-center justify-center rounded-2xl px-3 py-2.5 transition ${notificationDrawerOpen ? 'bg-[#2f6fed] text-white' : 'bg-[#1a2230] text-zinc-200 hover:bg-[#243040]'}`}
                aria-label="Уведомления"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
              <NotificationDrawer
                isOpen={notificationDrawerOpen}
                onClose={() => setNotificationDrawerOpen(false)}
              />
              <Link
                href="/dashboard"
                className={navItemClass(isDashboard)}
                aria-label="Панель"
              >
                <DashboardIcon className="h-4 w-4" />
                <span className="hidden md:inline">Панель</span>
              </Link>
              <Link
                href="/project"
                className={navItemClass(isProjectLibrary || isProjectsArea)}
                aria-label="Мои проекты"
              >
                <ProjectsIcon className="h-4 w-4" />
                <span className="hidden md:inline">Мои проекты</span>
              </Link>
            </div>

            {(isDashboard || isProfile) && (
              <Link
                href="/profile/setup"
                className={navItemClass(isProfile)}
                aria-label="Профиль"
              >
                <ProfileIcon className="h-4 w-4" />
                <span className="hidden md:inline">Профиль</span>
              </Link>
            )}

            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  )
}
