'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function RoofPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/projects/create/walls-2/parameters"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" aria-label="Назад" />
            </Link>
            <h1 className="text-2xl font-bold">Крыша</h1>
            <div className="w-[88px]" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center text-2xl">
            🏠
          </div>
          <p className="mt-5 text-lg font-semibold">Раздел &quot;Крыша&quot;</p>
          <p className="mt-2 text-sm text-zinc-400">
            Этот раздел находится в разработке
          </p>
        </div>
      </main>
    </div>
  )
}

