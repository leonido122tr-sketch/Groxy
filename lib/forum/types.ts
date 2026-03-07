export type ForumCategory = {
  id: string
  name: string
  slug: string
  sort_order: number
}

export type ForumTopic = {
  id: string
  category_id: string
  user_id: string
  title: string
  content: string
  pinned: boolean
  views_count: number
  replies_count: number
  created_at: string
  updated_at: string
}

export type ForumPost = {
  id: string
  topic_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export type ForumTopicImage = {
  id: string
  topic_id: string
  file_path: string
}

export type ForumPostImage = {
  id: string
  post_id: string
  file_path: string
}

export type ForumTopicWithAuthor = ForumTopic & {
  author_display_name?: string | null
  author_email?: string | null
}

export type ForumPostWithAuthor = ForumPost & {
  author_email?: string
}
