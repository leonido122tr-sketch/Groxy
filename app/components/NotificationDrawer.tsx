'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useAndroidBackHandler } from '@/app/components/BackButton'
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

type Props = {
  isOpen: boolean
  onClose: () => void
}

/** Высота блока списка ≈ 4 элемента (~56px каждый) */
const LIST_MAX_HEIGHT = 224

export function NotificationDrawer({ isOpen, onClose }: Props) {
  const { user } = useAuth()
  const [list, setList] = useState<ForumNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const data = await fetchForumNotifications(supabase)
    setList(data)
  }, [user])

  useEffect(() => {
    if (!isOpen) {
      setVisible(false)
      setClosing(false)
      return
    }
    setVisible(false)
    setClosing(false)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [isOpen])

  useEffect(() => {
    if (closing && !visible) {
      const t = setTimeout(() => {
        onClose()
        setClosing(false)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [closing, visible, onClose])

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true)
      load().finally(() => setLoading(false))
    }
  }, [isOpen, user, load])

  useAndroidBackHandler(() => {
    if (isOpen) {
      setClosing(true)
      setVisible(false)
    }
  }, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClosing(true)
        setVisible(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const handleMarkRead = useCallback(
    async (id: string) => {
      const supabase = createClient()
      const ok = await markForumNotificationRead(supabase, id)
      if (ok) {
        setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        window.dispatchEvent(new CustomEvent('forum-notifications-changed'))
      }
    },
    []
  )

  const handleMarkAllRead = useCallback(async () => {
    const supabase = createClient()
    const ok = await markAllForumNotificationsRead(supabase)
    if (ok) {
      setList((prev) => prev.map((n) => ({ ...n, read: true })))
      window.dispatchEvent(new CustomEvent('forum-notifications-changed'))
    }
  }, [])

  const handleOverlayClick = useCallback(() => {
    setClosing(true)
    setVisible(false)
  }, [])

  if (!isOpen || typeof document === 'undefined') return null

  const content = (
    <div
      className={`fixed inset-0 z-50 flex justify-center pt-24 transition-opacity duration-200 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-modal="true"
      aria-label="Уведомления"
      role="dialog"
    >
      {/* Полупрозрачный фон */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleOverlayClick}
        aria-hidden
      />
      {/* Панель с анимацией появления */}
      <div
        className={`relative z-10 w-full max-w-md px-4 transition-all duration-200 ease-out ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl border border-white/10 bg-[#141a22] shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-base font-semibold text-white">Уведомления</h2>
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
          <div
            className="overflow-y-auto overflow-x-hidden"
            style={{ maxHeight: LIST_MAX_HEIGHT }}
          >
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-400">Загрузка…</p>
            ) : list.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-400">Нет уведомлений</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {list.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.category_slug ? `/forum/${n.category_slug}?topic=${n.topic_id}` : '/forum'}
                      className="block px-4 py-3 hover:bg-white/5"
                      onClick={() => {
                        if (!n.read) handleMarkRead(n.id)
                        onClose()
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={
                              n.read ? 'text-sm text-zinc-400' : 'text-sm font-medium text-white'
                            }
                          >
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
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
