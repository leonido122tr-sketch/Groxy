import { KNOWLEDGE_SLUGS } from '@/lib/knowledge/constants'
import { KnowledgeTopicClient } from './KnowledgeTopicClient'

/** Статический экспорт: каждый slug из списка должен быть в generateStaticParams. */
export const dynamicParams = false

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
