'use client'

import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ForwardIcon, IconBadge, ThermalIcon, VaporIcon } from '@/app/components/AppIcons'

export default function MaterialsComparePage() {
  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-zinc-400">Аналитика материалов</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-white">Сравнение материалов</h2>
        </div>

        <Link href="/materials/compare/thermal" className="block rounded-[22px] active:scale-[0.995]">
          <SurfaceCard className="min-h-[84px] p-4">
            <div className="flex min-h-14 items-center gap-4">
              <IconBadge tone="blue">
                <ThermalIcon className="h-5 w-5" />
              </IconBadge>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">Теплопроводность</p>
                <p className="mt-1 text-sm text-zinc-300">Сравнение по удержанию и передаче тепла.</p>
              </div>
              <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-500" />
            </div>
          </SurfaceCard>
        </Link>

        <Link href="/materials/compare/vapor" className="block rounded-[22px] active:scale-[0.995]">
          <SurfaceCard className="min-h-[84px] p-4">
            <div className="flex min-h-14 items-center gap-4">
              <IconBadge tone="teal">
                <VaporIcon className="h-5 w-5" />
              </IconBadge>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">Паропроницаемость</p>
                <p className="mt-1 text-sm text-zinc-300">Сравнение материалов по влагопереносу и дыханию конструкции.</p>
              </div>
              <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-500" />
            </div>
          </SurfaceCard>
        </Link>
      </div>
    </AppPage>
  )
}
