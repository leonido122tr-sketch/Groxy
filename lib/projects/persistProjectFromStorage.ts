/**
 * Сохраняет проект из sessionStorage в устройство/localStorage (для кнопки «Сохранить» / дискеты).
 */

import { Capacitor } from '@capacitor/core'
import type { LocalProject } from './localProjects'
import {
  getLocalProject,
  listLocalProjects,
  upsertLocalProject,
  makeProjectId,
} from './localProjects'
import { saveProjectToDevice, listDeviceProjects } from './deviceProjects'
import { getFoundationRoofOverridesFromStorage, getWallsOverridesFromStorage } from './resultOverridesStorage'

export type WallsVariant = 'walls_2' | 'walls_3' | 'walls_4'

async function findDuplicateByNameAndType(
  trimmedName: string,
  projectType: WallsVariant,
  excludeId: string
): Promise<LocalProject | null> {
  const webProjects = listLocalProjects().filter((p) => p.platform !== 'android')
  const webDuplicate = webProjects.find(
    (p) => p.type === projectType && p.name.trim() === trimmedName && p.id !== excludeId
  )
  if (webDuplicate) return webDuplicate
  if (Capacitor.isNativePlatform()) {
    try {
      const deviceProjects = await listDeviceProjects()
      const deviceDuplicate = deviceProjects.find(
        (p) => p.type === projectType && p.name.trim() === trimmedName && p.id !== excludeId
      )
      if (deviceDuplicate) return deviceDuplicate
    } catch {
      // ignore
    }
  }
  return null
}

/** Сохраняет проект типа walls_2 из sessionStorage. overwriteProjectId — при подтверждении перезаписи дубликата. Возвращает projectId или null. */
export async function persistProjectFromStorageWalls2(overwriteProjectId?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const suffix = '_walls_2'
  const projectName = (sessionStorage.getItem(`currentProjectName${suffix}`) || 'Проект').trim()
  const pdfComment = (sessionStorage.getItem(`pdfComment${suffix}`) || '').trim() || undefined
  const notes = (sessionStorage.getItem(`notes${suffix}`) || '').trim() || undefined

  let projectData: Record<string, unknown> | null = null
  const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
  if (savedData) {
    try {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } catch {
      return null
    }
  } else {
    const lastId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)
    if (lastId) {
      try {
        if (Capacitor.isNativePlatform()) {
          const list = await listDeviceProjects()
          const p = list.find((x) => x.id === lastId && x.type === 'walls_2')
          if (p && p.type === 'walls_2') {
            projectData = {
              name: p.name,
              material: p.data.material,
              principle: p.data.principle,
              width: p.data.width,
              length: p.data.length,
              height: p.data.height,
              thickness: p.data.thickness,
              openings: p.data.openings,
              note: p.data.note,
            }
          }
        } else {
          const p = getLocalProject(lastId)
          if (p && p.type === 'walls_2') {
            projectData = {
              name: p.name,
              material: p.data.material,
              principle: p.data.principle,
              width: p.data.width,
              length: p.data.length,
              height: p.data.height,
              thickness: p.data.thickness,
              openings: p.data.openings,
              note: p.data.note,
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const foundationRaw = sessionStorage.getItem('currentProjectData_foundation_2')
  let foundation:
    | {
        length: number
        width: number
        height: number
        thickness: number
        principle: 'inside' | 'outside'
        concreteGrade?: string
      }
    | undefined
  if (foundationRaw) {
    try {
      const f = JSON.parse(foundationRaw) as Record<string, unknown>
      const fl = Number(f.length ?? 0)
      const fw = Number(f.width ?? 0)
      const fh = Number(f.height ?? 0)
      const ft = Number(f.thickness ?? 0)
      if (fl > 0 && fw > 0 && fh > 0 && ft > 0) {
        foundation = {
          length: fl,
          width: fw,
          height: fh,
          thickness: ft,
          principle: f.principle === 'inside' ? 'inside' : 'outside',
          concreteGrade: typeof f.concreteGrade === 'string' ? f.concreteGrade : undefined,
        }
      }
    } catch {
      // ignore
    }
  }

  const w = Number(projectData?.width ?? 0)
  const len = Number(projectData?.length ?? 0)
  const h = Number(projectData?.height ?? 0)
  const t = Number(projectData?.thickness ?? 0)
  const hasWalls = w > 0 && len > 0 && h > 0 && t > 0
  let hasRoof = false
  const roofRawCheck = sessionStorage.getItem('currentProjectData_roof_2')
  if (roofRawCheck) {
    try {
      const r = JSON.parse(roofRawCheck) as Record<string, number>
      if (Number(r.width ?? 0) > 0 && Number(r.length ?? 0) > 0) hasRoof = true
    } catch {
      // ignore
    }
  }
  const hasFoundation = !!foundation
  if (!hasFoundation && !hasWalls && !hasRoof) return null

  if (!projectData) {
    projectData = {
      name: projectName || 'Проект',
      material: '',
      principle: 'inside',
      width: 0,
      length: 0,
      height: 0,
      thickness: 0,
      openings: [],
      note: '',
    }
  }

  const trimmedName = projectName || String(projectData.name ?? 'Проект')
  let projectId = overwriteProjectId ?? sessionStorage.getItem(`lastSavedProjectId${suffix}`)?.trim() ?? makeProjectId()
  const duplicate = await findDuplicateByNameAndType(trimmedName, 'walls_2', projectId)
  if (duplicate && duplicate.id !== projectId) {
    throw new Error('DUPLICATE_PROJECT_NAME')
  }
  if (duplicate) projectId = duplicate.id

  const existingProject = getLocalProject(projectId)
  const now = new Date().toISOString()
  const isAndroid = Capacitor.isNativePlatform()
  const platform = isAndroid ? ('android' as const) : ('web' as const)
  const openings = (projectData.openings as Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 }>) || []

  let roof: { width: number; length: number; height: number; overhang: number; area?: number } | undefined
  const roofRaw = sessionStorage.getItem('currentProjectData_roof_2')
  if (roofRaw) {
    try {
      const r = JSON.parse(roofRaw) as Record<string, number>
      const rw = Number(r.width ?? 0)
      const rl = Number(r.length ?? 0)
      if (rw > 0 && rl > 0) {
        const rh = Number(r.height ?? 0)
        const ro = Number(r.overhang ?? 0)
        const slopeLength = Math.sqrt(rw * rw + rh * rh)
        const area = Math.round((slopeLength + ro) * (rl + ro) * 100) / 100
        roof = { width: rw, length: rl, height: rh, overhang: ro, area }
      }
    } catch {
      // ignore
    }
  }
  // Только из storage (как на view), иначе после «Сбросить к расчёту» в проект снова попадали бы старые из existingProject
  const resultsOverridesMerged = { ...getFoundationRoofOverridesFromStorage('2'), ...getWallsOverridesFromStorage('2') }
  const project: LocalProject = {
    id: projectId,
    name: trimmedName,
    type: 'walls_2',
    createdAt: now,
    updatedAt: now,
    data: {
      principle: (projectData.principle === 'inside' ? 'inside' : 'outside') as 'inside' | 'outside',
      material: String(projectData.material ?? ''),
      width: w,
      length: len,
      height: h,
      thickness: t,
      openings,
      note: projectData.note != null ? String(projectData.note) : undefined,
    },
    platform,
    pdfComment: pdfComment ?? undefined,
    notes: notes || undefined,
    ...(foundation ? { foundation } : {}),
    ...(roof ? { roof } : {}),
    resultsOverrides: resultsOverridesMerged,
  }

  if (isAndroid) {
    ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
    try {
      await saveProjectToDevice(project)
    } finally {
      ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
    }
  } else {
    upsertLocalProject(project)
  }
  sessionStorage.setItem(`lastSavedProjectId${suffix}`, projectId)
  sessionStorage.setItem(
    `currentProjectData${suffix}`,
    JSON.stringify({
      name: project.name,
      material: project.data.material,
      principle: project.data.principle,
      width: projectData.width,
      length: projectData.length,
      height: project.data.height,
      thickness: project.data.thickness,
      openings: project.data.openings,
      note: project.data.note,
    })
  )
  return projectId
}

/** Сохраняет проект типа walls_3 из sessionStorage. overwriteProjectId — при подтверждении перезаписи дубликата. */
export async function persistProjectFromStorageWalls3(
  overwriteProjectId?: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const suffix = '_walls_3'
  const projectName = (sessionStorage.getItem(`currentProjectName${suffix}`) || 'Проект').trim()
  const pdfComment = (sessionStorage.getItem(`pdfComment${suffix}`) || '').trim() || undefined
  const notes = (sessionStorage.getItem(`notes${suffix}`) || '').trim() || undefined

  let projectData: Record<string, unknown> | null = null
  const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
  if (savedData) {
    try {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } catch {
      return null
    }
  } else {
    const lastId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)
    if (lastId) {
      try {
        if (Capacitor.isNativePlatform()) {
          const list = await listDeviceProjects()
          const p = list.find((x) => x.id === lastId && x.type === 'walls_3')
          if (p && p.type === 'walls_3') {
            const d = p.data
            projectData = {
              name: p.name,
              material: d.material,
              principle: d.principle,
              left: d.left,
              back: d.back,
              right: d.right,
              height: d.height,
              thickness: d.thickness,
              openings: d.openings,
              note: d.note,
            }
          }
        } else {
          const p = getLocalProject(lastId)
          if (p && p.type === 'walls_3') {
            const d = p.data
            projectData = {
              name: p.name,
              material: d.material,
              principle: d.principle,
              left: d.left,
              back: d.back,
              right: d.right,
              height: d.height,
              thickness: d.thickness,
              openings: d.openings,
              note: d.note,
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const foundationRaw = sessionStorage.getItem('currentProjectData_foundation_3')
  let hasFoundation = false
  let foundationForSave: { left: number; back: number; right: number; height: number; thickness: number; principle: 'inside' | 'outside'; concreteGrade?: string } | undefined
  if (foundationRaw) {
    try {
      const f = JSON.parse(foundationRaw) as Record<string, unknown>
      const fl = Number(f.left ?? 0)
      const fb = Number(f.back ?? 0)
      const fr = Number(f.right ?? 0)
      const fh = Number(f.height ?? 0)
      const ft = Number(f.thickness ?? 0)
      if (fl > 0 && fb > 0 && fr > 0 && fh > 0 && ft > 0) {
        hasFoundation = true
        foundationForSave = {
          left: fl,
          back: fb,
          right: fr,
          height: fh,
          thickness: ft,
          principle: f.principle === 'inside' ? 'inside' : 'outside',
          concreteGrade: typeof f.concreteGrade === 'string' ? f.concreteGrade : undefined,
        }
      }
    } catch {
      // ignore
    }
  }
  let roofForSave: { left: number; back: number; right: number; height: number; overhang: number; area?: number } | undefined
  const roofRaw = sessionStorage.getItem('currentProjectData_roof_3')
  if (roofRaw) {
    try {
      const r = JSON.parse(roofRaw) as Record<string, number>
      const rl = Number(r.left ?? 0)
      const rb = Number(r.back ?? 0)
      const rr = Number(r.right ?? 0)
      if (rl > 0 && rb > 0 && rr > 0) {
        const rh = Number(r.height ?? 0)
        const ro = Number(r.overhang ?? 0)
        const depth = Math.max(rl, rr)
        const slopeLength = Math.sqrt(depth * depth + rh * rh)
        roofForSave = { left: rl, back: rb, right: rr, height: rh, overhang: ro, area: Math.round((slopeLength + ro) * (rb + 2 * ro) * 100) / 100 }
      }
    } catch {
      // ignore
    }
  }
  const left = Number(projectData?.left ?? 0)
  const back = Number(projectData?.back ?? 0)
  const right = Number(projectData?.right ?? 0)
  const h = Number(projectData?.height ?? 0)
  const t = Number(projectData?.thickness ?? 0)
  const hasWalls = left > 0 && back > 0 && right > 0 && h > 0 && t > 0
  if (!hasWalls && !hasFoundation && !roofForSave) return null

  if (!projectData) {
    projectData = {
      name: projectName || 'Проект',
      material: '',
      principle: 'inside',
      left: 0,
      back: 0,
      right: 0,
      height: 0,
      thickness: 0,
      openings: [],
      note: '',
    }
  }

  const trimmedName = projectName || String(projectData.name ?? 'Проект')
  let projectId = overwriteProjectId ?? (sessionStorage.getItem(`lastSavedProjectId${suffix}`)?.trim() || makeProjectId())
  if (!overwriteProjectId) {
    const duplicate = await findDuplicateByNameAndType(trimmedName, 'walls_3', projectId)
    if (duplicate && duplicate.id !== projectId) throw new Error('DUPLICATE_PROJECT_NAME')
    if (duplicate) projectId = duplicate.id
  }

  const existingProject = getLocalProject(projectId)
  const now = new Date().toISOString()
  const isAndroid = Capacitor.isNativePlatform()
  const platform = isAndroid ? ('android' as const) : ('web' as const)
  const openings = (projectData.openings as Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 }>) || []
  // Только из storage (как на view), иначе после «Сбросить к расчёту» в проект снова попадали бы старые из existingProject
  const resultsOverridesMerged = { ...getFoundationRoofOverridesFromStorage('3'), ...getWallsOverridesFromStorage('3') }
  const project: LocalProject = {
    id: projectId,
    name: trimmedName,
    type: 'walls_3',
    createdAt: now,
    updatedAt: now,
    data: {
      principle: (projectData.principle === 'inside' ? 'inside' : 'outside') as 'inside' | 'outside',
      material: String(projectData.material ?? ''),
      left: Number(projectData.left ?? 0),
      back: Number(projectData.back ?? 0),
      right: Number(projectData.right ?? 0),
      height: Number(projectData.height ?? 0),
      thickness: Number(projectData.thickness ?? 0),
      openings,
      note: projectData.note != null ? String(projectData.note) : undefined,
    },
    platform,
    pdfComment: pdfComment ?? undefined,
    notes: notes || undefined,
    ...(foundationForSave ? { foundation: foundationForSave } : {}),
    ...(roofForSave ? { roof: roofForSave } : {}),
    resultsOverrides: resultsOverridesMerged,
  }
  if (isAndroid) {
    ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
    try {
      await saveProjectToDevice(project)
    } finally {
      ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
    }
  } else {
    upsertLocalProject(project)
  }
  sessionStorage.setItem(`lastSavedProjectId${suffix}`, projectId)
  sessionStorage.setItem(`currentProjectData${suffix}`, JSON.stringify(projectData))
  return projectId
}

/** Сохраняет проект типа walls_4 из sessionStorage. overwriteProjectId — при подтверждении перезаписи дубликата. */
export async function persistProjectFromStorageWalls4(
  overwriteProjectId?: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const suffix = '_walls_4'
  const projectName = (sessionStorage.getItem(`currentProjectName${suffix}`) || 'Проект').trim()
  const pdfComment = (sessionStorage.getItem(`pdfComment${suffix}`) || '').trim() || undefined
  const notes = (sessionStorage.getItem(`notes${suffix}`) || '').trim() || undefined

  let projectData: Record<string, unknown> | null = null
  const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
  if (savedData) {
    try {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } catch {
      return null
    }
  } else {
    const lastId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)
    if (lastId) {
      try {
        if (Capacitor.isNativePlatform()) {
          const list = await listDeviceProjects()
          const p = list.find((x) => x.id === lastId && x.type === 'walls_4')
          if (p && p.type === 'walls_4') {
            const d = p.data
            projectData = {
              name: p.name,
              material: d.material,
              principle: d.principle,
              width: d.width,
              length: d.length,
              height: d.height,
              thickness: d.thickness,
              openings: d.openings,
              note: d.note,
            }
          }
        } else {
          const p = getLocalProject(lastId)
          if (p && p.type === 'walls_4') {
            const d = p.data
            projectData = {
              name: p.name,
              material: d.material,
              principle: d.principle,
              width: d.width,
              length: d.length,
              height: d.height,
              thickness: d.thickness,
              openings: d.openings,
              note: d.note,
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const foundationRaw = sessionStorage.getItem('currentProjectData_foundation_4')
  let hasFoundation = false
  let foundationForSave: { length: number; width: number; height: number; thickness: number; principle: 'inside' | 'outside'; concreteGrade?: string } | undefined
  if (foundationRaw) {
    try {
      const f = JSON.parse(foundationRaw) as Record<string, unknown>
      const fl = Number(f.length ?? 0)
      const fw = Number(f.width ?? 0)
      const fh = Number(f.height ?? 0)
      const ft = Number(f.thickness ?? 0)
      if (fl > 0 && fw > 0 && fh > 0 && ft > 0) {
        hasFoundation = true
        foundationForSave = {
          length: fl,
          width: fw,
          height: fh,
          thickness: ft,
          principle: f.principle === 'inside' ? 'inside' : 'outside',
          concreteGrade: typeof f.concreteGrade === 'string' ? f.concreteGrade : undefined,
        }
      }
    } catch {
      // ignore
    }
  }
  let roofForSave: { width: number; length: number; height: number; overhang: number; area: number } | undefined
  const roofRaw = sessionStorage.getItem('currentProjectData_roof_4')
  if (roofRaw) {
    try {
      const r = JSON.parse(roofRaw) as Record<string, number>
      const rw = Number(r.width ?? 0)
      const rl = Number(r.length ?? 0)
      if (rw > 0 && rl > 0) {
        const rh = Number(r.height ?? 0)
        const ro = Number(r.overhang ?? 0)
        const slopeLength = Math.sqrt(rw * rw + rh * rh)
        roofForSave = { width: rw, length: rl, height: rh, overhang: ro, area: Math.round((slopeLength + 2 * ro) * (rl + 2 * ro) * 100) / 100 }
      }
    } catch {
      // ignore
    }
  }
  const w = Number(projectData?.width ?? 0)
  const len = Number(projectData?.length ?? 0)
  const h = Number(projectData?.height ?? 0)
  const t = Number(projectData?.thickness ?? 0)
  const hasWalls = w > 0 && len > 0 && h > 0 && t > 0
  if (!hasWalls && !hasFoundation && !roofForSave) return null

  if (!projectData) {
    projectData = {
      name: projectName || 'Проект',
      material: '',
      principle: 'inside',
      width: 0,
      length: 0,
      height: 0,
      thickness: 0,
      openings: [],
      note: '',
    }
  }

  const trimmedName = projectName || String(projectData.name ?? 'Проект')
  let projectId = overwriteProjectId ?? (sessionStorage.getItem(`lastSavedProjectId${suffix}`)?.trim() || makeProjectId())
  if (!overwriteProjectId) {
    const duplicate = await findDuplicateByNameAndType(trimmedName, 'walls_4', projectId)
    if (duplicate && duplicate.id !== projectId) throw new Error('DUPLICATE_PROJECT_NAME')
    if (duplicate) projectId = duplicate.id
  }

  const existingProject = getLocalProject(projectId)
  const now = new Date().toISOString()
  const isAndroid = Capacitor.isNativePlatform()
  const platform = isAndroid ? ('android' as const) : ('web' as const)
  const openings = (projectData.openings as Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 | 4 }>) || []
  // Только из storage (как на view), иначе после «Сбросить к расчёту» в проект снова попадали бы старые из existingProject
  const resultsOverridesMerged = { ...getFoundationRoofOverridesFromStorage('4'), ...getWallsOverridesFromStorage('4') }
  const project: LocalProject = {
    id: projectId,
    name: trimmedName,
    type: 'walls_4',
    createdAt: now,
    updatedAt: now,
    data: {
      principle: (projectData.principle === 'inside' ? 'inside' : 'outside') as 'inside' | 'outside',
      material: String(projectData.material ?? ''),
      width: Number(projectData.width ?? 0),
      length: Number(projectData.length ?? 0),
      height: Number(projectData.height ?? 0),
      thickness: Number(projectData.thickness ?? 0),
      openings,
      note: projectData.note != null ? String(projectData.note) : undefined,
    },
    platform,
    pdfComment: pdfComment ?? undefined,
    notes: notes || undefined,
    ...(foundationForSave ? { foundation: foundationForSave } : {}),
    ...(roofForSave ? { roof: roofForSave } : {}),
    resultsOverrides: resultsOverridesMerged,
  }
  if (isAndroid) {
    ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
    try {
      await saveProjectToDevice(project)
    } finally {
      ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
    }
  } else {
    upsertLocalProject(project)
  }
  sessionStorage.setItem(`lastSavedProjectId${suffix}`, projectId)
  sessionStorage.setItem(`currentProjectData${suffix}`, JSON.stringify(projectData))
  return projectId
}