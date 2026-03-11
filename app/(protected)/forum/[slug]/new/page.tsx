import { FORUM_CATEGORY_SLUGS } from '@/lib/forum/constants'
import { NewTopicClient } from './NewTopicClient'

export function generateStaticParams() {
  return FORUM_CATEGORY_SLUGS.map((slug) => ({ slug }))
}

export default async function NewTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <NewTopicClient slug={slug} />
}
