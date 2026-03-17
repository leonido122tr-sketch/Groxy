'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'
import { PageLoader } from '@/app/components/PageLoader'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  fetchForumNotifications,
  markForumNotificationRead,
  markAllForumNotificationsRead,
} from '@/lib/forum/notifications'
import type { ForumNotification } from '@/lib/forum/types'

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [list, setList] = useState<ForumNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const data = await fetchForumNotifications(supabase)
    setList(data)
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    load().finally(() => setLoading(false))
  }, [user, load])

  const handleMarkRead = async (id: string) => {
    const supabase = createClient()
    const ok = await markForumNotificationRead(supabase, id)
    if (ok) {
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      window.dispatchEvent(new CustomEvent('forum-notifications-changed'))
    }
  }

  const handleMarkAllRead = async () => {
    const supabase = createClient()
    const ok = await markAllForumNotificationsRead(supabase)
    if (ok) {
      setList((prev) => prev.map((n) => ({ ...n, read: true })))
      window.dispatchEvent(new CustomEvent('forum-notifications-changed'))
    }
  }

  if (!user) return <PageLoader message="Перенаправление..." />
  if (loading) return <PageLoader />

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-white">Уведомления</h1>
          {list.some((n) => !n.read) && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              Прочитать все
            </button>
          )}
        </div>

        <SurfaceCard className="p-0">
          {list.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">Нет уведомлений</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {list.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.category_slug ? `/forum/${n.category_slug}?topic=${n.topic_id}` : '/forum'}
                    className="block px-5 py-4 hover:bg-white/5"
                    onClick={() => !n.read && handleMarkRead(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={n.read ? 'text-sm text-zinc-400' : 'text-sm font-medium text-white'}>
                          В теме «{n.topic_title ?? '…'}» новый комментарий
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{formatDate(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <span className="shrink-0 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                          Новое
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>

        <BackButton fallbackHref="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          Назад
        </BackButton>
      </div>
    </AppPage>
  )
}
