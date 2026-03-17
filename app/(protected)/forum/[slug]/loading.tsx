import { AppPage } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'

export default function ForumCategoryLoading() {
  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        {/* Back + title card skeleton */}
        <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
        <div className="rounded-2xl bg-[#141a22] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-8 w-56 rounded-lg bg-white/10 animate-pulse" />
              <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="h-10 w-28 rounded-2xl bg-white/10 animate-pulse" />
          </div>
        </div>
        {/* Topic cards skeleton */}
        <ul className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="overflow-hidden rounded-2xl bg-[#141a22]">
              <div className="px-5 pt-4">
                <div className="h-5 w-full rounded bg-white/10 animate-pulse" />
                {i % 3 === 0 && (
                  <div className="mt-3 h-40 w-full rounded-lg bg-white/5 animate-pulse" />
                )}
              </div>
              <div className="flex flex-wrap gap-3 px-5 py-4">
                <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 border-t border-white/5 px-5 pb-4 pt-2">
                <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
                <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppPage>
  )
}
