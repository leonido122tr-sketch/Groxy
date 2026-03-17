'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const Demo3DContent = dynamic(() => import('./Demo3DContent'), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f14] text-zinc-400">
      Загрузка 3D…
    </div>
  ),
})

function Demo3DLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f14] text-zinc-400">
      Загрузка 3D…
    </div>
  )
}

export default function Demo3DPage() {
  return (
    <Suspense fallback={<Demo3DLoading />}>
      <Demo3DContent />
    </Suspense>
  )
}
