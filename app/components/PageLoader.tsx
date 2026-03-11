'use client'

import Image from 'next/image'
import { AppPage, SurfaceCard } from './AppShell'

export function PageLoader({ message = 'Загрузка...' }: { message?: string }) {
  return (
    <AppPage width="sm" className="justify-center">
      <SurfaceCard accent className="mx-auto w-full max-w-sm p-8 text-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300" />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
              <Image src="/logo.png" alt="Groxy" width={32} height={32} className="h-8 w-8 object-contain" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold tracking-[-0.03em] text-white">Groxy</p>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
      </SurfaceCard>
    </AppPage>
  )
}
