'use client'

import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ForumIcon, ForwardIcon, IconBadge } from '@/app/components/AppIcons'

export default function CommunityPage() {
  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="p-5">
          <div className="flex items-start gap-3">
            <IconBadge tone="blue" size="sm">
              <ForumIcon className="h-5 w-5" />
            </IconBadge>
            <div>
              <h2 className="text-2xl font-semibold text-white">Сообщество</h2>
              <p className="mt-1 text-sm text-zinc-300">Обсуждения, обмен опытом и вопросы по строительству.</p>
            </div>
          </div>
        </SurfaceCard>

        <Link
          href="/forum"
          className="block rounded-[22px] active:scale-[0.995]"
        >
          <SurfaceCard className="min-h-[80px] p-4">
            <div className="flex min-h-12 items-center gap-4">
              <IconBadge tone="blue" size="sm">
                <ForumIcon className="h-5 w-5" />
              </IconBadge>
              <span className="min-w-0 flex-1 text-base font-medium text-white">Форум</span>
              <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-500" />
            </div>
          </SurfaceCard>
        </Link>
      </div>
    </AppPage>
  )
}
