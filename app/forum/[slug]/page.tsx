import { Suspense } from 'react'
import { FORUM_CATEGORY_SLUGS } from '@/lib/forum/constants'
import { ForumSlugPageClient } from './ForumSlugPageClient'
import { PageLoader } from '@/app/components/PageLoader'

export function generateStaticParams() {
  return FORUM_CATEGORY_SLUGS.map((slug) => ({ slug }))
}

export default async function ForumSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <Suspense fallback={<PageLoader />}>
      <ForumSlugPageClient slug={slug} />
    </Suspense>
  )
}
