'use client'

import { DirtyProvider } from '../DirtyContext'

export default function Walls3Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DirtyProvider>{children}</DirtyProvider>
}
