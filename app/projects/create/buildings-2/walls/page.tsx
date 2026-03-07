'use client'

import { DirtyProvider } from '../DirtyContext'
import WallsCalculator from '../../walls-2/WallsCalculator'

export default function WallsCreatePage() {
  return (
    <DirtyProvider>
      <WallsCalculator mode="create" />
    </DirtyProvider>
  )
}


