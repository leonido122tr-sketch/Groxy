'use client'

import { useState } from 'react'
import Walls4Calculator from '../walls4Calculator'
import { DetailPlanWallsWalls4 } from '@/app/components/DetailPlanWallsWalls4'
import type { LocalProject, Opening } from '@/lib/projects/localProjects'
import { useAndroidBackHandler } from '@/app/components/BackButton'

function getProjectFromStorage(): Extract<LocalProject, { type: 'walls_4' }> {
  const defaultData = {
    principle: 'inside' as const,
    material: '',
    width: 0,
    length: 0,
    height: 0,
    thickness: 0,
    openings: [] as Opening[],
  }
  if (typeof window === 'undefined') {
    return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_4', data: defaultData }
  }
  try {
    const raw = sessionStorage.getItem('currentProjectData_walls_4')
    if (!raw) return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_4', data: defaultData }
    const parsed = JSON.parse(raw) as { width?: number; length?: number; height?: number; thickness?: number; openings?: Opening[]; principle?: 'inside' | 'outside'; material?: string }
    const data = {
      principle: (parsed.principle === 'outside' ? 'outside' : 'inside') as 'inside' | 'outside',
      material: typeof parsed.material === 'string' ? parsed.material : defaultData.material,
      width: Number(parsed.width) >= 0 ? Number(parsed.width) : 0,
      length: Number(parsed.length) >= 0 ? Number(parsed.length) : 0,
      height: Number(parsed.height) >= 0 ? Number(parsed.height) : 0,
      thickness: Number(parsed.thickness) >= 0 ? Number(parsed.thickness) : 0,
      openings: Array.isArray(parsed.openings) ? (parsed.openings as Opening[]) : defaultData.openings,
    }
    return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_4', data }
  } catch {
    return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_4', data: defaultData }
  }
}

export default function Walls4WallsPage() {
  const [showBigPlan, setShowBigPlan] = useState(false)
  useAndroidBackHandler(() => setShowBigPlan(false), showBigPlan)
  return (
    <>
      <Walls4Calculator
        mode="create"
        onSchemaClick={() => setShowBigPlan(true)}
      />
      {showBigPlan && (
        <DetailPlanWallsWalls4
          project={getProjectFromStorage()}
          onOpeningsChange={(nextOpenings) => {
            if (typeof window !== 'undefined') {
              try {
                const raw = sessionStorage.getItem('currentProjectData_walls_4')
                const prev = raw ? JSON.parse(raw) as Record<string, unknown> : {}
                sessionStorage.setItem('currentProjectData_walls_4', JSON.stringify({ ...prev, openings: nextOpenings }))
                sessionStorage.setItem('projectIsDirty', 'true')
                window.dispatchEvent(new CustomEvent('projectDataChanged'))
              } catch {
                // ignore
              }
            }
          }}
          onClose={() => {
            setShowBigPlan(false)
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wallsPlanClosed', { detail: { type: 'walls_4' } }))
          }}
        />
      )}
    </>
  )
}
