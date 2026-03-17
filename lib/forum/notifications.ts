import type { SupabaseClient } from '@supabase/supabase-js'
import type { ForumNotification } from './types'

export async function fetchForumNotifications(
  supabase: SupabaseClient,
  limit = 50
): Promise<ForumNotification[]> {
  const { data: list, error } = await supabase
    .from('forum_notifications')
    .select('id, user_id, topic_id, post_id, created_at, read')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !list?.length) return (list ?? []).map((r) => ({ ...r, topic_title: undefined, category_slug: undefined }))

  const topicIds = [...new Set((list as { topic_id: string }[]).map((r) => r.topic_id))]
  const { data: topics } = await supabase
    .from('forum_topics')
    .select('id, title, category_id')
    .in('id', topicIds)
  const categoryIds = [...new Set((topics ?? []).map((t: { category_id: string }) => t.category_id))]
  const { data: categories } = await supabase
    .from('forum_categories')
    .select('id, slug')
    .in('id', categoryIds)

  const topicMap = new Map((topics ?? []).map((t: { id: string; title: string; category_id: string }) => [t.id, t]))
  const categoryMap = new Map((categories ?? []).map((c: { id: string; slug: string }) => [c.id, c]))

  return (list as Array<{ id: string; user_id: string; topic_id: string; post_id: string; created_at: string; read: boolean }>).map((r) => {
    const topic = topicMap.get(r.topic_id)
    const category = topic ? categoryMap.get(topic.category_id) : undefined
    return {
      ...r,
      topic_title: topic?.title,
      category_slug: category?.slug,
    }
  })
}

export async function fetchUnreadForumNotificationsCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from('forum_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)

  if (error) return 0
  return count ?? 0
}

export async function markForumNotificationRead(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('forum_notifications')
    .update({ read: true })
    .eq('id', id)

  return !error
}

export async function markAllForumNotificationsRead(
  supabase: SupabaseClient
): Promise<boolean> {
  const { error } = await supabase
    .from('forum_notifications')
    .update({ read: true })
    .eq('read', false)

  return !error
}
