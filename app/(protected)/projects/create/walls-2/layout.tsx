'use client'

import { DirtyProvider } from '../DirtyContext'

export default function Walls2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DirtyProvider>{children}</DirtyProvider>
}
