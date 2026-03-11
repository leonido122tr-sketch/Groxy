import { KNOWLEDGE_SLUGS } from '@/lib/knowledge/constants'
import { KnowledgeTopicClient } from './KnowledgeTopicClient'

export function generateStaticParams() {
  return KNOWLEDGE_SLUGS.map((slug) => ({ slug }))
}

export default async function KnowledgeTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <KnowledgeTopicClient slug={slug} />
}
