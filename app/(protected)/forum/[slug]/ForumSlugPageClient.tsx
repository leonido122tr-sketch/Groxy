'use client'

import { useSearchParams } from 'next/navigation'
import { ForumCategoryClient } from './ForumCategoryClient'
import { ForumTopicClient } from './ForumTopicClient'

export function ForumSlugPageClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const topicId = searchParams.get('topic')

  if (topicId) {
    return <ForumTopicClient slug={slug} topicId={topicId} />
  }
  return <ForumCategoryClient slug={slug} />
}
