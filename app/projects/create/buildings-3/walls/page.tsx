'use client'

import { DirtyProvider } from '../../buildings-2/DirtyContext'
import Walls3Calculator from '../../walls-3/walls3Calculator'

export default function Walls3Page() {
  return (
    <DirtyProvider>
      <Walls3Calculator mode="create" />
    </DirtyProvider>
  )
}
