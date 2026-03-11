'use client'

import { DirtyProvider } from '../DirtyContext'

export default function Walls4Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DirtyProvider>{children}</DirtyProvider>
}
