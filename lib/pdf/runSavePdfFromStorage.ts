/**
 * Сохранение проекта из sessionStorage и генерация/сохранение PDF (по иконке дискеты).
 */

import { Capacitor } from '@capacitor/core'
import {
  persistProjectFromStorageWalls2,
  persistProjectFromStorageWalls3,
  persistProjectFromStorageWalls4,
} from '@/lib/projects/persistProjectFromStorage'
import { getLocalProject, type LocalProject } from '@/lib/projects/localProjects'
import { listDeviceProjects } from '@/lib/projects/deviceProjects'
import { getFoundationRoofOverridesFromStorage } from '@/lib/projects/resultOverridesStorage'

const MATERIALS: Record<string, string> = {
  brick_m100: 'Кирпич (M100)',
  brick_m150: 'Кирпич (M150)',
  concrete_m200: 'Бетон (M200)',
  concrete_m300: 'Бетон (M300)',
  polystyrene_concrete_d400: 'Полистиролбетон (D400)',
  polystyrene_concrete_d500: 'Полистиролбетон (D500)',
  wood_pine: 'Дерево (Сосна)',
  wood_larch: 'Дерево (Лиственница)',
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export type WallsVariant = 'walls_2' | 'walls_3' | 'walls_4'

/** Сохраняет PDF из sessionStorage. Возвращает { uri, filename } или null при ошибке/нет данных. */
export async function runSavePdfFromStorage(
  type: WallsVariant
): Promise<{ uri: string; filename: string } | null> {
  if (typeof window === 'undefined') return null
  const n = type === 'walls_2' ? '2' : type === 'walls_3' ? '3' : '4'
  const suffix = `_walls_${n}`

  const projectName = (sessionStorage.getItem(`currentProjectName${suffix}`) || 'Проект').trim()
  const includePdfMeta = sessionStorage.getItem(`includePdfMeta${suffix}`) === 'true'
  const pdfComment = (sessionStorage.getItem(`pdfComment${suffix}`) || '').trim() || undefined

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
          const p = list.find((x) => x.id === lastId && x.type === type)
          if (p && p.type === type) {
            const d = (p as { data: Record<string, unknown> }).data
            projectData = type === 'walls_2'
              ? { name: p.name, material: d.material, principle: d.principle, width: d.width, length: d.length, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
              : type === 'walls_3'
                ? { name: p.name, material: d.material, principle: d.principle, left: d.left, back: d.back, right: d.right, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
                : { name: p.name, material: d.material, principle: d.principle, width: d.width, length: d.length, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
          }
        } else {
          const p = getLocalProject(lastId)
          if (p && p.type === type) {
            const d = p.data as Record<string, unknown>
            projectData = type === 'walls_2'
              ? { name: p.name, material: d.material, principle: d.principle, width: d.width, length: d.length, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
              : type === 'walls_3'
                ? { name: p.name, material: d.material, principle: d.principle, left: d.left, back: d.back, right: d.right, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
                : { name: p.name, material: d.material, principle: d.principle, width: d.width, length: d.length, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (type === 'walls_2') {
    const projectId = await persistProjectFromStorageWalls2()
    if (projectId === null && !projectData) return null
    return runSaveWalls2(projectName, includePdfMeta, pdfComment, projectData, n)
  }
  if (type === 'walls_3') {
    return runSaveWalls3(projectName, includePdfMeta, pdfComment, projectData, n)
  }
  return runSaveWalls4(projectName, includePdfMeta, pdfComment, projectData, n)
}

async function runSaveWalls2(
  projectName: string,
  includePdfMeta: boolean,
  pdfComment: string | undefined,
  projectData: Record<string, unknown> | null,
  n: string
): Promise<{ uri: string; filename: string } | null> {
  const foundationRaw = sessionStorage.getItem(`currentProjectData_foundation_${n}`)
  let foundation: { length: number; width: number; height: number; thickness: number; principle: 'inside' | 'outside'; concreteGrade?: string } | undefined
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

  let roof: { width: number; length: number; height: number; overhang: number; area?: number } | undefined
  const roofRaw = sessionStorage.getItem(`currentProjectData_roof_${n}`)
  if (roofRaw) {
    try {
      const r = JSON.parse(roofRaw) as Record<string, number>
      const rw = Number(r.width ?? 0)
      const rl = Number(r.length ?? 0)
      if (rw > 0 && rl > 0) {
        const rh = Number(r.height ?? 0)
        const ro = Number(r.overhang ?? 0)
        const slopeLength = Math.sqrt(rw * rw + rh * rh)
        roof = { width: rw, length: rl, height: rh, overhang: ro, area: Math.round((slopeLength + ro) * (rl + ro) * 100) / 100 }
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
  const hasFoundation = !!foundation
  const hasRoof = !!roof
  if (!hasWalls && !hasFoundation && !hasRoof) return null

  if (!projectData) {
    projectData = { principle: 'inside', material: '', width: 0, length: 0, height: 0, thickness: 0, openings: [] }
  }

  const openings = (projectData.openings as Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 }>) || []
  const materialLabel = MATERIALS[String(projectData.material ?? '')] || 'Не выбран'
  const principleLabel = projectData.principle === 'inside' ? 'Внутри' : 'Снаружи'
  const overrides = getFoundationRoofOverridesFromStorage('2')

  const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
  const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
  const trimmedName = projectName || String(projectData.name ?? 'Проект')

  let pdfBytes: Uint8Array
  if (hasWalls) {
    const adj = projectData.principle === 'inside' ? t / 2 : -t / 2
    const l1 = Math.max(0, w + adj)
    const l2 = Math.max(0, len + adj)
    const openingsArea = openings.reduce((s, o) => s + (o.width || 0) * (o.height || 0), 0)
    const wallArea = Math.max(0, (l1 + l2) * h - openingsArea)
    const volume = Math.max(0, wallArea * t)
    const innerAdj = projectData.principle === 'inside' ? 0 : -t / 2
    const area = Math.max(0, (w + innerAdj) * (len + innerAdj))
    const payload = {
      title: trimmedName || 'Проект строительства',
      includeMeta: includePdfMeta,
      materialLabel,
      principleLabel,
      dims: { width: w, length: len, height: h, thickness: t },
      results: { area, volume },
      openings: openings.map((o) => ({ width: o.width, height: o.height, ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}), ...(o.wall != null ? { wall: o.wall } : {}), })),
      type: 'walls_2' as const,
      foundation,
      ...(roof?.area != null ? { roof: { width: roof.width, length: roof.length, height: roof.height, overhang: roof.overhang, area: roof.area } } : {}),
      ...(Object.keys(overrides).length > 0 ? { resultsOverrides: overrides } : {}),
      pdfComment,
    }
    pdfBytes = await generatePdfWithPlanCapture('walls_2', payload)
  } else {
    pdfBytes = await generatePdfClient({
      title: trimmedName || 'Проект строительства',
      includeMeta: includePdfMeta,
      skipWalls: true,
      type: 'walls_2',
      foundation,
      ...(roof?.area != null ? { roof: { width: roof.width, length: roof.length, height: roof.height, overhang: roof.overhang, area: roof.area } } : {}),
      ...(Object.keys(overrides).length > 0 ? { resultsOverrides: overrides } : {}),
      pdfComment,
    })
  }

  const filename = `${trimmedName}_${formatDate(new Date())}.pdf`
  const base64Data = uint8ArrayToBase64(pdfBytes)
  const meta = { projectName: trimmedName, projectType: 'walls_2', materialLabel, principleLabel }

  if (Capacitor.isNativePlatform()) {
    const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
    const result = await savePdfToDevice(filename, pdfBytes)
    if (!result) return null
    const uri = typeof result === 'string' ? result : result.uri
    const filePath = typeof result === 'string' ? undefined : result.path
    sessionStorage.setItem('pdfViewerUri', uri)
    sessionStorage.setItem('pdfViewerFilename', filename)
    if (filePath) sessionStorage.setItem('pdfViewerFilePath', filePath)
    sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
    sessionStorage.setItem('pdfViewerPdfData', JSON.stringify(meta))
    sessionStorage.setItem('projectIsDirty', 'false')
    return { uri, filename }
  }
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  sessionStorage.setItem('pdfViewerUri', url)
  sessionStorage.setItem('pdfViewerFilename', filename)
  sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
  sessionStorage.setItem('pdfViewerPdfData', JSON.stringify(meta))
  sessionStorage.setItem('projectIsDirty', 'false')
  return { uri: url, filename }
}

function hasWalls3Section(projectData: Record<string, unknown> | null): boolean {
  if (!projectData) return false
  return (
    Number(projectData.left ?? 0) > 0 &&
    Number(projectData.back ?? 0) > 0 &&
    Number(projectData.right ?? 0) > 0 &&
    Number(projectData.height ?? 0) > 0 &&
    Number(projectData.thickness ?? 0) > 0
  )
}
function hasFoundation3Section(): boolean {
  const raw = sessionStorage.getItem('currentProjectData_foundation_3')
  if (!raw) return false
  try {
    const f = JSON.parse(raw) as Record<string, unknown>
    return (
      Number(f.left ?? 0) > 0 &&
      Number(f.back ?? 0) > 0 &&
      Number(f.right ?? 0) > 0 &&
      Number(f.height ?? 0) > 0 &&
      Number(f.thickness ?? 0) > 0
    )
  } catch {
    return false
  }
}
function hasRoof3Section(): boolean {
  const raw = sessionStorage.getItem('currentProjectData_roof_3')
  if (!raw) return false
  try {
    const r = JSON.parse(raw) as Record<string, number>
    return Number(r.left ?? 0) > 0 && Number(r.back ?? 0) > 0 && Number(r.right ?? 0) > 0
  } catch {
    return false
  }
}

/** Генерирует PDF для проекта 3 стен и записывает uri/filename в sessionStorage. Вызывается после persist. */
export async function generateAndStorePdfWalls3(
  projectId: string
): Promise<{ uri: string; filename: string } | null> {
  const suffix = '_walls_3'
  const project = getLocalProject(projectId) as Extract<LocalProject, { type: 'walls_3' }> | null
  if (!project || project.type !== 'walls_3') return null
  const projectName = (sessionStorage.getItem(`currentProjectName${suffix}`) || 'Проект').trim()
  const includePdfMeta = sessionStorage.getItem(`includePdfMeta${suffix}`) === 'true'
  const pdfComment = (sessionStorage.getItem(`pdfComment${suffix}`) || '').trim() || undefined
  let projectData: Record<string, unknown> = {}
  const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
  if (savedData) {
    try {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } catch {
      return null
    }
  }
  const trimmedName = projectName || String(projectData.name ?? 'Проект')
  const hasWalls3 = hasWalls3Section(projectData)
  const openings = (projectData.openings as Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 }>) || []
  const materialLabel = MATERIALS[String(projectData.material ?? '')] || 'Не выбран'
  const principleLabel = projectData.principle === 'inside' ? 'Внутри' : 'Снаружи'

  let foundation: { left: number; back: number; right: number; height: number; thickness: number; principle: 'inside' | 'outside'; concreteGrade?: string } | undefined
  const foundationRaw = sessionStorage.getItem('currentProjectData_foundation_3')
  if (foundationRaw) {
    try {
      const f = JSON.parse(foundationRaw) as Record<string, unknown>
      const fl = Number(f.left ?? 0)
      const fb = Number(f.back ?? 0)
      const fr = Number(f.right ?? 0)
      const fh = Number(f.height ?? 0)
      const ft = Number(f.thickness ?? 0)
      if (fl > 0 && fb > 0 && fr > 0 && fh > 0 && ft > 0) {
        foundation = {
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
  let roofPayload: { roof: { left: number; back: number; right: number; height: number; overhang: number; area: number } } | object = {}
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
        const area = Math.round((slopeLength + ro) * (rb + 2 * ro) * 100) / 100
        roofPayload = { roof: { left: rl, back: rb, right: rr, height: rh, overhang: ro, area } }
      }
    } catch {
      // ignore
    }
  }

  const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
  const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
  let pdfBytes: Uint8Array
  if (hasWalls3) {
    const t = Number(projectData.thickness ?? 0)
    const sign = projectData.principle === 'inside' ? 1 : -1
    const l1 = Math.max(0, Number(projectData.left ?? 0) + sign * (t / 2))
    const l2 = Math.max(0, Number(projectData.back ?? 0) + sign * t)
    const l3 = Math.max(0, Number(projectData.right ?? 0) + sign * (t / 2))
    const h = Number(projectData.height ?? 0)
    const openingsArea = openings.reduce((s, o) => s + (o.width || 0) * (o.height || 0), 0)
    const wallArea = Math.max(0, (l1 + l2 + l3) * h - openingsArea)
    const volume = Math.max(0, wallArea * t)
    const left = Number(projectData.left ?? 0)
    const right = Number(projectData.right ?? 0)
    const back = Number(projectData.back ?? 0)
    const maxSide = Math.max(left, right)
    const area =
      projectData.principle === 'inside'
        ? Math.max(0, back * maxSide)
        : Math.max(0, Math.max(0, back - t) * Math.max(0, maxSide - t / 2))
    const payload = {
      title: trimmedName || 'Проект строительства',
      includeMeta: includePdfMeta,
      materialLabel,
      principleLabel,
      dims: { left: Number(projectData.left), back: Number(projectData.back), right: Number(projectData.right), height: h, thickness: t },
      results: { area, volume },
      openings: openings.map((o) => ({ width: o.width, height: o.height, ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}), ...(o.wall != null ? { wall: o.wall } : {}), })),
      type: 'walls_3' as const,
      foundation,
      ...roofPayload,
      ...(project.resultsOverrides && Object.keys(project.resultsOverrides).length > 0 ? { resultsOverrides: project.resultsOverrides } : {}),
      pdfComment,
    }
    pdfBytes = await generatePdfWithPlanCapture('walls_3', payload)
  } else {
    pdfBytes = await generatePdfClient({
      title: trimmedName || 'Проект строительства',
      includeMeta: includePdfMeta,
      skipWalls: true,
      type: 'walls_3',
      foundation,
      ...roofPayload,
      ...(project.resultsOverrides && Object.keys(project.resultsOverrides).length > 0 ? { resultsOverrides: project.resultsOverrides } : {}),
      pdfComment,
    })
  }
  const filename = `${trimmedName}_${formatDate(new Date())}.pdf`
  const base64Data = uint8ArrayToBase64(pdfBytes)
  const meta = { projectName: trimmedName, projectType: 'walls_3', materialLabel, principleLabel }
  if (Capacitor.isNativePlatform()) {
    const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
    const result = await savePdfToDevice(filename, pdfBytes)
    if (!result) return null
    const uri = typeof result === 'string' ? result : result.uri
    const filePath = typeof result === 'string' ? undefined : result.path
    sessionStorage.setItem('pdfViewerUri', uri)
    sessionStorage.setItem('pdfViewerFilename', filename)
    if (filePath) sessionStorage.setItem('pdfViewerFilePath', filePath)
    sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
    sessionStorage.setItem('pdfViewerPdfData', JSON.stringify(meta))
    sessionStorage.setItem('projectIsDirty', 'false')
    return { uri, filename }
  }
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  sessionStorage.setItem('pdfViewerUri', url)
  sessionStorage.setItem('pdfViewerFilename', filename)
  sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
  sessionStorage.setItem('pdfViewerPdfData', JSON.stringify(meta))
  sessionStorage.setItem('projectIsDirty', 'false')
  return { uri: url, filename }
}

function hasWalls4Section(projectData: Record<string, unknown> | null): boolean {
  if (!projectData) return false
  return (
    Number(projectData.width ?? 0) > 0 &&
    Number(projectData.length ?? 0) > 0 &&
    Number(projectData.height ?? 0) > 0 &&
    Number(projectData.thickness ?? 0) > 0
  )
}
function hasFoundation4Section(): boolean {
  const raw = sessionStorage.getItem('currentProjectData_foundation_4')
  if (!raw) return false
  try {
    const f = JSON.parse(raw) as Record<string, unknown>
    return (
      Number(f.length ?? 0) > 0 &&
      Number(f.width ?? 0) > 0 &&
      Number(f.height ?? 0) > 0 &&
      Number(f.thickness ?? 0) > 0
    )
  } catch {
    return false
  }
}
function hasRoof4Section(): boolean {
  const raw = sessionStorage.getItem('currentProjectData_roof_4')
  if (!raw) return false
  try {
    const r = JSON.parse(raw) as Record<string, number>
    return Number(r.width ?? 0) > 0 && Number(r.length ?? 0) > 0
  } catch {
    return false
  }
}

/** Генерирует PDF для проекта 4 стен и записывает uri/filename в sessionStorage. Вызывается после persist. */
export async function generateAndStorePdfWalls4(
  projectId: string
): Promise<{ uri: string; filename: string } | null> {
  const suffix = '_walls_4'
  const project = getLocalProject(projectId) as Extract<LocalProject, { type: 'walls_4' }> | null
  if (!project || project.type !== 'walls_4') return null
  const projectName = (sessionStorage.getItem(`currentProjectName${suffix}`) || 'Проект').trim()
  const includePdfMeta = sessionStorage.getItem(`includePdfMeta${suffix}`) === 'true'
  const pdfComment = (sessionStorage.getItem(`pdfComment${suffix}`) || '').trim() || undefined
  let projectData: Record<string, unknown> = {}
  const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
  if (savedData) {
    try {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } catch {
      return null
    }
  }
  const trimmedName = projectName || String(projectData.name ?? 'Проект')
  const w = Number(projectData.width ?? 0)
  const len = Number(projectData.length ?? 0)
  const h = Number(projectData.height ?? 0)
  const t = Number(projectData.thickness ?? 0)
  const openings = (projectData.openings as Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 | 4 }>) || []
  const materialLabel = MATERIALS[String(projectData.material ?? '')] || 'Не выбран'
  const principleLabel = projectData.principle === 'inside' ? 'Внутри' : 'Снаружи'
  let foundation: { length: number; width: number; height: number; thickness: number; principle: 'inside' | 'outside'; concreteGrade?: string } | undefined
  const foundationRaw = sessionStorage.getItem('currentProjectData_foundation_4')
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
  const sign = projectData.principle === 'inside' ? 1 : -1
  const openingsArea = openings.reduce((s, o) => s + (o.width || 0) * (o.height || 0), 0)
  const wSide = Math.max(0, w + sign * t)
  const lSide = Math.max(0, len + sign * t)
  const perimeter = 2 * (wSide + lSide)
  const wallArea = Math.max(0, perimeter * h - openingsArea)
  const volume = Math.max(0, wallArea * t)
  const area =
    projectData.principle === 'inside'
      ? Math.max(0, w * len)
      : Math.max(0, Math.max(0, w - 2 * t) * Math.max(0, len - 2 * t))
  let roofForPayload: { width: number; length: number; height: number; overhang: number; area: number } | undefined
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
        roofForPayload = { width: rw, length: rl, height: rh, overhang: ro, area: Math.round((slopeLength + 2 * ro) * (rl + 2 * ro) * 100) / 100 }
      }
    } catch {
      // ignore
    }
  }
  const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
  const payload = {
    title: trimmedName || 'Проект строительства',
    includeMeta: includePdfMeta,
    materialLabel,
    principleLabel,
    dims: { width: w, length: len, height: h, thickness: t },
    results: { area, volume },
    openings: openings.map((o) => ({ width: o.width, height: o.height, ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}), ...(o.wall != null ? { wall: o.wall } : {}), })),
    type: 'walls_4' as const,
    foundation,
    ...(roofForPayload ? { roof: roofForPayload } : {}),
    ...(project.resultsOverrides && Object.keys(project.resultsOverrides).length > 0 ? { resultsOverrides: project.resultsOverrides } : {}),
    pdfComment,
  }
  const pdfBytes = await generatePdfWithPlanCapture('walls_4', payload)
  const filename = `${trimmedName}_${formatDate(new Date())}.pdf`
  const base64Data = uint8ArrayToBase64(pdfBytes)
  const meta = { projectName: trimmedName, projectType: 'walls_4', materialLabel, principleLabel }
  if (Capacitor.isNativePlatform()) {
    const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
    const result = await savePdfToDevice(filename, pdfBytes)
    if (!result) return null
    const uri = typeof result === 'string' ? result : result.uri
    const filePath = typeof result === 'string' ? undefined : result.path
    sessionStorage.setItem('pdfViewerUri', uri)
    sessionStorage.setItem('pdfViewerFilename', filename)
    if (filePath) sessionStorage.setItem('pdfViewerFilePath', filePath)
    sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
    sessionStorage.setItem('pdfViewerPdfData', JSON.stringify(meta))
    sessionStorage.setItem('projectIsDirty', 'false')
    return { uri, filename }
  }
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  sessionStorage.setItem('pdfViewerUri', url)
  sessionStorage.setItem('pdfViewerFilename', filename)
  sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
  sessionStorage.setItem('pdfViewerPdfData', JSON.stringify(meta))
  sessionStorage.setItem('projectIsDirty', 'false')
  return { uri: url, filename }
}

async function runSaveWalls3(
  projectName: string,
  _includePdfMeta: boolean,
  _pdfComment: string | undefined,
  projectData: Record<string, unknown> | null,
  _n: string
): Promise<{ uri: string; filename: string } | null> {
  const hasWalls = hasWalls3Section(projectData)
  const hasFoundation = hasFoundation3Section()
  const hasRoof = hasRoof3Section()
  if (!hasWalls && !hasFoundation && !hasRoof) return null
  let projectId: string | null = null
  try {
    projectId = await persistProjectFromStorageWalls3()
  } catch (e) {
    if (e instanceof Error && e.message === 'DUPLICATE_PROJECT_NAME') return null
    throw e
  }
  if (!projectId) return null
  return generateAndStorePdfWalls3(projectId)
}

async function runSaveWalls4(
  projectName: string,
  _includePdfMeta: boolean,
  _pdfComment: string | undefined,
  projectData: Record<string, unknown> | null,
  _n: string
): Promise<{ uri: string; filename: string } | null> {
  const hasWalls = hasWalls4Section(projectData)
  const hasFoundation = hasFoundation4Section()
  const hasRoof = hasRoof4Section()
  if (!hasWalls && !hasFoundation && !hasRoof) return null
  let projectId: string | null = null
  try {
    projectId = await persistProjectFromStorageWalls4()
  } catch (e) {
    if (e instanceof Error && e.message === 'DUPLICATE_PROJECT_NAME') return null
    throw e
  }
  if (!projectId) return null
  return generateAndStorePdfWalls4(projectId)
}
