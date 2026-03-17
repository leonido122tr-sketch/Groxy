import { AppPage } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'

export default function ForumLoading() {
  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        {/* Hero card skeleton */}
        <div className="relative overflow-hidden rounded-2xl bg-white/10">
          <div className="h-28 animate-pulse" />
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <div className="h-8 w-48 rounded-lg bg-white/20 animate-pulse" />
            <div className="mt-2 h-4 w-64 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
        {/* Sections skeleton */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141a22]">
          <div className="bg-[#1a2332] px-4 py-3">
            <div className="h-4 w-32 rounded bg-white/20 animate-pulse" />
          </div>
          <nav className="flex flex-col">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex min-h-[72px] items-center gap-3 px-4 py-3 ${i > 1 ? 'border-t border-white/5' : ''}`}
              >
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/10 animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-white/10 bg-[#1a2332] px-4 py-3">
            <div className="h-4 w-40 rounded bg-white/20 animate-pulse" />
          </div>
          <nav className="flex flex-col">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex min-h-[72px] items-center gap-3 px-4 py-3 border-t border-white/5`}
              >
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </nav>
          <div className="border-t border-white/10 bg-[#1a2332] px-4 py-3">
            <div className="h-4 w-24 rounded bg-white/20 animate-pulse" />
          </div>
          <div className="flex min-h-[72px] items-center gap-3 px-4 py-3 border-t border-white/5">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </AppPage>
  )
}
