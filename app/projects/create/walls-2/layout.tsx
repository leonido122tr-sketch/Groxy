'use client'

import { DirtyProvider } from '../buildings-2/DirtyContext'

export default function Walls2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DirtyProvider>{children}</DirtyProvider>
}
