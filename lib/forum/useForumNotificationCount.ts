'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchUnreadForumNotificationsCount } from './notifications'

export function useForumNotificationCount(userId: string | undefined) {
  const [count, setCount] = useState(0)

  const refetch = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }
    const supabase = createClient()
    const n = await fetchUnreadForumNotificationsCount(supabase)
    setCount(n)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setCount(0)
      return
    }
    let cancelled = false
    const supabase = createClient()
    const update = () => {
      fetchUnreadForumNotificationsCount(supabase).then((n) => {
        if (!cancelled) setCount(n)
      })
    }
    update()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') update()
    }
    const onNotificationsChanged = () => update()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('forum-notifications-changed', onNotificationsChanged)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('forum-notifications-changed', onNotificationsChanged)
    }
  }, [userId])

  return { count, refetch }
}
