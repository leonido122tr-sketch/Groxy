'use client'

import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ForumIcon, ForwardIcon, IconBadge } from '@/app/components/AppIcons'

export default function CommunityPage() {
  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="relative overflow-hidden p-0">
          <img
            src="/dashboard/community.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50"
            aria-hidden
          />
          <div className="relative z-10 flex items-start gap-3 p-5">
            <IconBadge tone="blue" size="sm">
              <ForumIcon className="h-5 w-5" />
            </IconBadge>
            <div>
              <h2 className="text-2xl font-semibold text-white drop-shadow-sm">Сообщество</h2>
              <p className="mt-1 text-sm text-zinc-300">Обсуждения, обмен опытом и вопросы по строительству.</p>
            </div>
          </div>
        </SurfaceCard>

        <Link
          href="/forum"
          className="block rounded-[22px] active:scale-[0.995]"
        >
          <SurfaceCard className="relative overflow-hidden p-0">
            <img
              src="/dashboard/forum.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50"
              aria-hidden
            />
            <div className="relative z-10 flex min-h-[88px] items-center gap-4 p-4">
              <IconBadge tone="blue" size="sm">
                <ForumIcon className="h-5 w-5" />
              </IconBadge>
              <div className="min-w-0 flex-1">
                <span className="text-base font-medium text-white drop-shadow-sm">Форум</span>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-300">Темы, вопросы и ответы по строительству.</p>
              </div>
              <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-400" />
            </div>
          </SurfaceCard>
        </Link>
      </div>
    </AppPage>
  )
}
