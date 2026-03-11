import { FORUM_CATEGORY_SLUGS } from '@/lib/forum/constants'

export function generateStaticParams() {
  return FORUM_CATEGORY_SLUGS.map((slug) => ({ slug }))
}

export default function ForumSlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
