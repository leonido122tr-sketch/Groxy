import { AppPage } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'

export default function ProtectedLoading() {
  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-3/4 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-4 w-full rounded-lg bg-white/10 animate-pulse" />
          <div className="h-4 w-4/5 rounded-lg bg-white/10 animate-pulse" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    </AppPage>
  )
}
