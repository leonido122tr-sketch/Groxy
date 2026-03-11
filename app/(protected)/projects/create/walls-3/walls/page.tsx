'use client'

import { useState } from 'react'
import Walls3Calculator from '../walls3Calculator'
import { DetailPlanWallsWalls3 } from '@/app/components/DetailPlanWallsWalls3'
import type { LocalProject, Opening } from '@/lib/projects/localProjects'
import { useAndroidBackHandler } from '@/app/components/BackButton'

function getProjectFromStorage(): Extract<LocalProject, { type: 'walls_3' }> {
  const defaultData = {
    principle: 'inside' as const,
    material: '',
    left: 0,
    back: 0,
    right: 0,
    height: 0,
    thickness: 0,
    openings: [] as Opening[],
  }
  if (typeof window === 'undefined') {
    return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_3', data: defaultData }
  }
  try {
    const raw = sessionStorage.getItem('currentProjectData_walls_3')
    if (!raw) return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_3', data: defaultData }
    const parsed = JSON.parse(raw) as { left?: number; back?: number; right?: number; height?: number; thickness?: number; openings?: Opening[]; principle?: 'inside' | 'outside'; material?: string }
    const data = {
      principle: (parsed.principle === 'outside' ? 'outside' : 'inside') as 'inside' | 'outside',
      material: typeof parsed.material === 'string' ? parsed.material : defaultData.material,
      left: Number(parsed.left) >= 0 ? Number(parsed.left) : 0,
      back: Number(parsed.back) >= 0 ? Number(parsed.back) : 0,
      right: Number(parsed.right) >= 0 ? Number(parsed.right) : 0,
      height: Number(parsed.height) >= 0 ? Number(parsed.height) : 0,
      thickness: Number(parsed.thickness) >= 0 ? Number(parsed.thickness) : 0,
      openings: Array.isArray(parsed.openings) ? (parsed.openings as Opening[]) : defaultData.openings,
    }
    return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_3', data }
  } catch {
    return { id: 'create', name: '', createdAt: '', updatedAt: '', type: 'walls_3', data: defaultData }
  }
}

export default function Walls3WallsPage() {
  const [showBigPlan, setShowBigPlan] = useState(false)
  useAndroidBackHandler(() => setShowBigPlan(false), showBigPlan)
  return (
    <>
      <Walls3Calculator
        mode="create"
        onSchemaClick={() => setShowBigPlan(true)}
      />
      {showBigPlan && (
        <DetailPlanWallsWalls3
          project={getProjectFromStorage()}
          onOpeningsChange={(nextOpenings) => {
            if (typeof window !== 'undefined') {
              try {
                const raw = sessionStorage.getItem('currentProjectData_walls_3')
                const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
                sessionStorage.setItem('currentProjectData_walls_3', JSON.stringify({ ...prev, openings: nextOpenings }))
                sessionStorage.setItem('projectIsDirty', 'true')
                window.dispatchEvent(new CustomEvent('projectDataChanged'))
              } catch {
                // ignore
              }
            }
          }}
          onClose={() => {
            setShowBigPlan(false)
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wallsPlanClosed', { detail: { type: 'walls_3' } }))
          }}
        />
      )}
    </>
  )
}
