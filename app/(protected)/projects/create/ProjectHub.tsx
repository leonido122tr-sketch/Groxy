'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmModal } from '@/app/components/Modal'
import { useAndroidBackHandler, useSmartBack } from '@/app/components/BackButton'
import {
  BackIcon,
  DownloadIcon,
  FoundationIcon,
  RoofIcon,
  WallsIcon,
} from '@/app/components/AppIcons'
import { Capacitor } from '@capacitor/core'
import {
  getLocalProject,
  listLocalProjects,
  upsertLocalProject,
  makeProjectId,
  type LocalProject,
} from '@/lib/projects/localProjects'
import { getWallsOverridesFromStorage, getFoundationRoofOverridesFromStorage } from '@/lib/projects/resultOverridesStorage'
import { listDeviceProjects, saveProjectToDevice } from '@/lib/projects/deviceProjects'
import { persistProjectFromStorageWalls2, persistProjectFromStorageWalls3, persistProjectFromStorageWalls4 } from '@/lib/projects/persistProjectFromStorage'
import { PROJECTS_LIMIT } from '@/lib/projects/projectsLimit'
import { generateAndStorePdfWalls3, generateAndStorePdfWalls4 } from '@/lib/pdf/runSavePdfFromStorage'

export type ProjectHubType = 'walls_2' | 'walls_3' | 'walls_4'

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
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function getStorageSuffix(type: ProjectHubType): string {
  const n = type === 'walls_2' ? '2' : type === 'walls_3' ? '3' : '4'
  return `_walls_${n}`
}

/** Ищет проект с тем же именем и тем же типом (дубликат в рамках типа). */
async function findDuplicateByNameAndType(
  trimmedName: string,
  projectType: ProjectHubType,
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

function computeFoundationResult(
  type: ProjectHubType
): { volume: number; foundationLength: number } | null {
  if (typeof window === 'undefined') return null
  const n = type === 'walls_2' ? '2' : type === 'walls_3' ? '3' : '4'
  const raw = sessionStorage.getItem(`currentProjectData_foundation_${n}`)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const h = Number(data.height ?? 0)
    const t = Number(data.thickness ?? 0)
    const principle = data.principle === 'inside' ? 'inside' : 'outside'
    const adj = principle === 'inside' ? t / 2 : -t / 2
    if (type === 'walls_2' || type === 'walls_4') {
      const w = Number(data.width ?? 0)
      const len = Number(data.length ?? 0)
      if (len <= 0 || w <= 0 || h <= 0 || t <= 0) return null
      const adjustedWidth = Math.max(0, w + adj)
      const adjustedLength = Math.max(0, len + adj)
      const foundationLength = adjustedWidth + adjustedLength
      const volume = foundationLength * t * h
      return { volume, foundationLength }
    }
    const left = Number(data.left ?? 0)
    const back = Number(data.back ?? 0)
    const right = Number(data.right ?? 0)
    if (left <= 0 || back <= 0 || right <= 0 || h <= 0 || t <= 0) return null
    const adjustedLeft = Math.max(0, left + adj)
    const adjustedBack = Math.max(0, back + adj)
    const adjustedRight = Math.max(0, right + adj)
    const foundationLength = adjustedLeft + adjustedBack + adjustedRight
    const volume = foundationLength * t * h
    return { volume, foundationLength }
  } catch {
    return null
  }
}

function computeRoofResult(type: ProjectHubType): { area: number } | null {
  if (typeof window === 'undefined') return null
  const n = type === 'walls_2' ? '2' : type === 'walls_3' ? '3' : '4'
  const raw = sessionStorage.getItem(`currentProjectData_roof_${n}`)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, number>
    const height = Number(data.height ?? 0)
    const overhang = Number(data.overhang ?? 0)
    if (type === 'walls_2') {
      const width = Number(data.width ?? 0)
      const length = Number(data.length ?? 0)
      if (width <= 0 || length <= 0) return null
      const slopeLength = Math.sqrt(width * width + height * height)
      const area = (slopeLength + overhang) * (length + overhang)
      return { area: Math.round(area * 100) / 100 }
    }
    if (type === 'walls_3') {
      const left = Number(data.left ?? 0)
      const back = Number(data.back ?? 0)
      const right = Number(data.right ?? 0)
      if (left <= 0 || back <= 0 || right <= 0) return null
      const depth = Math.max(left, right)
      const slopeLength = Math.sqrt(depth * depth + height * height)
      const area = (slopeLength + overhang) * (back + 2 * overhang)
      return { area: Math.round(area * 100) / 100 }
    }
    if (type === 'walls_4') {
      const width = Number(data.width ?? 0)
      const length = Number(data.length ?? 0)
      if (width <= 0 || length <= 0) return null
      const slopeLength = Math.sqrt(width * width + height * height)
      const slopeDim = slopeLength + 2 * overhang
      const lengthDim = length + 2 * overhang
      const area = slopeDim * lengthDim
      return { area: Math.round(area * 100) / 100 }
    }
  } catch {
    // ignore
  }
  return null
}

function computeWallsResult(type: ProjectHubType): { area: number; volume: number } | null {
  if (typeof window === 'undefined') return null
  const n = type === 'walls_2' ? '2' : type === 'walls_3' ? '3' : '4'
  const raw = sessionStorage.getItem(`currentProjectData_walls_${n}`)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const h = Number(data.height ?? 0)
    const t = Number(data.thickness ?? 0)
    const principle = data.principle === 'inside' ? 'inside' : 'outside'
    const openings = (data.openings as Array<{ width: number; height: number }>) || []
    const openingsArea = openings.reduce((s, o) => s + (o.width || 0) * (o.height || 0), 0)
    if (type === 'walls_2') {
      const w = Number(data.width ?? 0)
      const len = Number(data.length ?? 0)
      if (w <= 0 || len <= 0 || h <= 0 || t <= 0) return null
      const adj = principle === 'inside' ? t / 2 : -t / 2
      const l1 = Math.max(0, w + adj)
      const l2 = Math.max(0, len + adj)
      const wallArea = Math.max(0, (l1 + l2) * h - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const innerAdj = principle === 'inside' ? 0 : -t / 2
      const area = Math.max(0, (w + innerAdj) * (len + innerAdj))
      return { area, volume }
    }
    if (type === 'walls_3') {
      const left = Number(data.left ?? 0)
      const back = Number(data.back ?? 0)
      const right = Number(data.right ?? 0)
      if (left <= 0 || back <= 0 || right <= 0 || h <= 0 || t <= 0) return null
      const sign = principle === 'inside' ? 1 : -1
      const l1 = Math.max(0, left + sign * (t / 2))
      const l2 = Math.max(0, back + sign * t)
      const l3 = Math.max(0, right + sign * (t / 2))
      const wallArea = Math.max(0, (l1 + l2 + l3) * h - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const maxSide = Math.max(left, right)
      const area =
        principle === 'inside'
          ? Math.max(0, back * maxSide)
          : Math.max(0, Math.max(0, back - t) * Math.max(0, maxSide - t / 2))
      return { area, volume }
    }
    const w = Number(data.width ?? 0)
    const len = Number(data.length ?? 0)
    if (w <= 0 || len <= 0 || h <= 0 || t <= 0) return null
    const sign = principle === 'inside' ? 1 : -1
    const wSide = Math.max(0, w + sign * t)
    const lSide = Math.max(0, len + sign * t)
    const perimeter = 2 * (wSide + lSide)
    const wallArea = Math.max(0, perimeter * h - openingsArea)
    const volume = Math.max(0, wallArea * t)
    const area =
      principle === 'inside'
        ? Math.max(0, w * len)
        : Math.max(0, Math.max(0, w - 2 * t) * Math.max(0, len - 2 * t))
    return { area, volume }
  } catch {
    return null
  }
}

type Props = {
  projectType: ProjectHubType
  title: string
}

export default function ProjectHub({ projectType, title }: Props) {
  const router = useRouter()
  const goBack = useSmartBack('/projects/create')
  const suffix = getStorageSuffix(projectType)

  const [projectName, setProjectName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)
  const [includePdfMeta, setIncludePdfMeta] = useState(false)
  const [showSaveBeforeExitModal, setShowSaveBeforeExitModal] = useState(false)
  /** Модалка «проект с таким именем уже есть» при сохранении (перезаписать / отмена) */
  const [saveDuplicateModal, setSaveDuplicateModal] = useState<{ duplicate: LocalProject } | null>(null)
  const [foundationResult, setFoundationResult] = useState<{
    volume: number
    foundationLength: number
  } | null>(null)
  const [wallsResult, setWallsResult] = useState<{ area: number; volume: number } | null>(null)
  const [roofResult, setRoofResult] = useState<{ area: number } | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [pdfComment, setPdfComment] = useState('')
  const [notes, setNotes] = useState('')
  const [foundationVolumeOverride, setFoundationVolumeOverride] = useState<number | undefined>(undefined)
  const [roofAreaOverride, setRoofAreaOverride] = useState<number | undefined>(undefined)
  const [wallsAreaOverride, setWallsAreaOverride] = useState<number | undefined>(undefined)
  const [wallsVolumeOverride, setWallsVolumeOverride] = useState<number | undefined>(undefined)

  const variant = projectType === 'walls_2' ? '2' : projectType === 'walls_3' ? '3' : '4'
  const readOverridesFromStorage = () => {
    if (typeof window === 'undefined') return
    const overrides = getFoundationRoofOverridesFromStorage(variant)
    const walls = getWallsOverridesFromStorage(variant)
    const f = overrides.foundationVolume
    const r = overrides.roofArea
    setFoundationVolumeOverride(f != null && Number.isFinite(f) && f >= 0 ? f : undefined)
    setRoofAreaOverride(r != null && Number.isFinite(r) && r >= 0 ? r : undefined)
    setWallsAreaOverride(walls.wallsArea != null && Number.isFinite(walls.wallsArea) && walls.wallsArea >= 0 ? walls.wallsArea : undefined)
    setWallsVolumeOverride(walls.wallsVolume != null && Number.isFinite(walls.wallsVolume) && walls.wallsVolume >= 0 ? walls.wallsVolume : undefined)
  }

  useEffect(() => {
    const savedName = sessionStorage.getItem(`currentProjectName${suffix}`)
    if (savedName) setProjectName(savedName)
    const savedIncludePdfMeta = sessionStorage.getItem(`includePdfMeta${suffix}`)
    if (savedIncludePdfMeta === 'true') setIncludePdfMeta(true)
    const savedPdfUriFromStorage = sessionStorage.getItem('pdfViewerUri')
    if (savedPdfUriFromStorage) setSavedPdfUri(savedPdfUriFromStorage)
    const sComment = sessionStorage.getItem(`pdfComment${suffix}`)
    if (sComment != null) setPdfComment(sComment)
    const sNotes = sessionStorage.getItem(`notes${suffix}`)
    if (sNotes != null) setNotes(sNotes)
    setFoundationResult(computeFoundationResult(projectType))
    setWallsResult(computeWallsResult(projectType))
    setRoofResult(computeRoofResult(projectType))
    readOverridesFromStorage()
    const dirty = sessionStorage.getItem('projectIsDirty') === 'true'
    setIsDirty(dirty)

    // Чтобы кнопка дискеты показывала актуальное состояние после возврата со страницы «Стены» (проёмы и т.д.)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('projectIsDirtyChanged'))
    }

    const handleProjectDataChanged = () => {
      setIsDirty(sessionStorage.getItem('projectIsDirty') === 'true')
      // savedPdfUri не сбрасываем: «Открыть PDF» открывает последний сохранённый; перезапись — по иконке сохранения
      setFoundationResult(computeFoundationResult(projectType))
      setWallsResult(computeWallsResult(projectType))
      setRoofResult(computeRoofResult(projectType))
      readOverridesFromStorage()
    }
    const handleProjectIsDirtyChanged = () => {
      setIsDirty(sessionStorage.getItem('projectIsDirty') === 'true')
    }
    window.addEventListener('projectDataChanged', handleProjectDataChanged)
    window.addEventListener('projectIsDirtyChanged', handleProjectIsDirtyChanged)
    return () => {
      window.removeEventListener('projectDataChanged', handleProjectDataChanged)
      window.removeEventListener('projectIsDirtyChanged', handleProjectIsDirtyChanged)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- readOverridesFromStorage intentionally omitted
  }, [projectType, suffix])

  const isPdfSaved = !!savedPdfUri
  const isPdfButtonActive = projectName.trim() !== '' || isPdfSaved

  const openSavedPdf = () => {
    if (!savedPdfUri) return
    const fallbackName = (projectName.trim() || 'Проект').replace(/[\\/:*?"<>|]+/g, '')
    const savedFilename = sessionStorage.getItem('pdfViewerFilename') || `${fallbackName}.pdf`
    router.push(
      `/pdf-viewer?uri=${encodeURIComponent(savedPdfUri)}&filename=${encodeURIComponent(savedFilename)}`
    )
  }

  const handleContinue = (section: 'foundation' | 'walls' | 'roof') => {
    if (projectName.trim()) {
      sessionStorage.setItem(`currentProjectName${suffix}`, projectName.trim())
    }
    const base = `/projects/create/walls-${projectType === 'walls_2' ? '2' : projectType === 'walls_3' ? '3' : '4'}`
    if (section === 'foundation') router.push(`${base}/foundation`)
    else if (section === 'walls') router.push(`${base}/walls`)
    else router.push(`${base}/roof`)
  }

  const savePdfToStorageAndState = (
    uri: string,
    filename: string,
    base64Data: string,
    meta: { projectName: string; projectType: string; materialLabel: string; principleLabel: string },
    filePath?: string
  ) => {
    sessionStorage.setItem('pdfViewerUri', uri)
    sessionStorage.setItem('pdfViewerFilename', filename)
    if (filePath) sessionStorage.setItem('pdfViewerFilePath', filePath)
    sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
    sessionStorage.setItem('pdfViewerPdfData', JSON.stringify(meta))
    setSavedPdfUri(uri)
    sessionStorage.setItem('projectIsDirty', 'false')
    setIsDirty(false)
  }

  const handleSavePdf = async (openViewer = false): Promise<boolean> => {
    if (savedPdfUri && !isDirty && !openViewer) return true

    try {
      if (projectType === 'walls_2') {
        return await handleSavePdfWalls2(openViewer)
      }
      if (projectType === 'walls_3') {
        return await handleSavePdfWalls3(openViewer)
      }
      return await handleSavePdfWalls4(openViewer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось создать PDF'
      setToast(message)
      setTimeout(() => setToast(null), 3000)
      return false
    }
  }

  const handleSavePdfWalls2 = async (openViewer: boolean): Promise<boolean> => {
    let projectData: Record<string, unknown> | null = null
    const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
    if (savedData) {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } else {
      const lastSavedProjectId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)
      if (lastSavedProjectId) {
        let project: LocalProject | null = null
        if (Capacitor.isNativePlatform()) {
          const deviceProjects = await listDeviceProjects()
          project = deviceProjects.find((p) => p.id === lastSavedProjectId && p.type === 'walls_2') || null
        } else {
          project = getLocalProject(lastSavedProjectId) as Extract<LocalProject, { type: 'walls_2' }> | null
        }
        if (project && project.type === 'walls_2') {
          projectData = {
            name: project.name,
            material: project.data.material,
            principle: project.data.principle,
            width: project.data.width,
            length: project.data.length,
            height: project.data.height,
            thickness: project.data.thickness,
            openings: project.data.openings,
            note: project.data.note,
          }
        }
      }
    }
    const foundationRawCheck = sessionStorage.getItem('currentProjectData_foundation_2')
    let hasFoundation = false
    if (foundationRawCheck) {
      try {
        const f = JSON.parse(foundationRawCheck) as Record<string, unknown>
        if (Number(f.length ?? 0) > 0 && Number(f.width ?? 0) > 0 && Number(f.height ?? 0) > 0 && Number(f.thickness ?? 0) > 0) hasFoundation = true
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
    if (!hasFoundation && !hasWalls && !hasRoof) {
      setToast('Заполните хотя бы один раздел: фундамент, стены или крышу')
      setTimeout(() => setToast(null), 3000)
      return false
    }
    const trimmedName = (projectName.trim() || String(projectData?.name ?? 'Проект')).trim()
    sessionStorage.setItem(`currentProjectName${suffix}`, trimmedName)
    let projectId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)?.trim() || makeProjectId()
    const duplicate2 = await findDuplicateByNameAndType(trimmedName, 'walls_2', projectId)
    if (duplicate2) {
      if (!window.confirm(`Проект с названием «${trimmedName}» уже существует (пристрой 2 стены). Перезаписать существующий проект?`)) return false
      projectId = duplicate2.id
    }
    setToast('Сохранение проекта...')
    try {
      projectId = (await persistProjectFromStorageWalls2(projectId)) ?? projectId
    } catch (e) {
      if (e instanceof Error && e.message === 'DUPLICATE_PROJECT_NAME') {
        setToast('Проект с таким названием уже существует')
        setTimeout(() => setToast(null), 3000)
        return false
      }
      throw e
    }
    let project = getLocalProject(projectId) as Extract<LocalProject, { type: 'walls_2' }> | null
    if (Capacitor.isNativePlatform() && !project) {
      const list = await listDeviceProjects()
      project = (list.find((p) => p.id === projectId && p.type === 'walls_2') as Extract<LocalProject, { type: 'walls_2' }>) || null
    }
    if (!project || project.type !== 'walls_2') {
      setToast('Не удалось загрузить проект')
      setTimeout(() => setToast(null), 3000)
      return false
    }
    const projectDataForPdf = project.data
    const principle = projectDataForPdf.principle === 'inside' ? 'inside' : 'outside'
    const openings = (projectDataForPdf.openings as Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 }>) || []
    const foundation = project.foundation
    const roof = project.roof
    const pdfCommentVal = project.pdfComment ?? (pdfComment.trim() || undefined)
    const materialLabel = MATERIALS[String(projectDataForPdf.material ?? '')] || 'Не выбран'
    const principleLabel = principle === 'inside' ? 'Внутри' : 'Снаружи'

    setToast('Создание PDF...')
    const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
    const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
    type PdfPayload = Parameters<typeof generatePdfWithPlanCapture>[1]
    let pdfBytes: Uint8Array
    if (hasWalls) {
      const adj = principle === 'inside' ? t / 2 : -t / 2
      const l1 = Math.max(0, w + adj)
      const l2 = Math.max(0, len + adj)
      const openingsArea = openings.reduce((sum, o) => sum + (o.width || 0) * (o.height || 0), 0)
      const wallArea = Math.max(0, (l1 + l2) * h - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const innerAdj = principle === 'inside' ? 0 : -t / 2
      const area = Math.max(0, (w + innerAdj) * (len + innerAdj))
      const payload = {
        title: project.name || 'Проект строительства',
        includeMeta: includePdfMeta,
        materialLabel,
        principleLabel,
        dims: { width: w, length: len, height: h, thickness: t },
        results: { area, volume },
        openings: openings.map((o) => ({ width: o.width, height: o.height, ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}), ...(o.wall != null ? { wall: o.wall } : {}), })),
        type: 'walls_2' as const,
        foundation,
        ...(roof?.area != null ? { roof: { width: roof.width, length: roof.length, height: roof.height, overhang: roof.overhang, area: roof.area } } : {}),
        ...(project.resultsOverrides && Object.keys(project.resultsOverrides).length > 0 ? { resultsOverrides: project.resultsOverrides } : {}),
        pdfComment: pdfCommentVal,
      } as PdfPayload
      pdfBytes = await generatePdfWithPlanCapture('walls_2', payload)
    } else {
      const payloadNoWalls = {
        title: project.name || 'Проект строительства',
        includeMeta: includePdfMeta,
        skipWalls: true,
        type: 'walls_2' as const,
        foundation,
        ...(roof?.area != null ? { roof: { width: roof.width, length: roof.length, height: roof.height, overhang: roof.overhang, area: roof.area } } : {}),
        ...(project.resultsOverrides && Object.keys(project.resultsOverrides).length > 0 ? { resultsOverrides: project.resultsOverrides } : {}),
        pdfComment: pdfCommentVal,
      } as PdfPayload
      pdfBytes = await generatePdfClient(payloadNoWalls)
    }

    const dateStr = formatDate(new Date())
    const filename = `${project.name}_${dateStr}.pdf`
    const base64Data = uint8ArrayToBase64(pdfBytes)
    const meta = {
      projectName: project.name,
      projectType: 'walls_2',
      materialLabel,
      principleLabel,
    }

    if (Capacitor.isNativePlatform()) {
      const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
      const result = await savePdfToDevice(filename, pdfBytes)
      if (!result) throw new Error('Не удалось сохранить PDF')
      const uri = typeof result === 'string' ? result : result.uri
      const filePath = typeof result === 'string' ? undefined : result.path
      savePdfToStorageAndState(uri, filename, base64Data, meta, filePath)
      if (openViewer) router.push(`/pdf-viewer?uri=${encodeURIComponent(uri)}&filename=${encodeURIComponent(filename)}`)
      return true
    }
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    savePdfToStorageAndState(url, filename, base64Data, meta)
    if (openViewer) router.push(`/pdf-viewer?uri=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
    return true
  }

  const handleSavePdfWalls3 = async (openViewer: boolean): Promise<boolean> => {
    let projectData: Record<string, unknown> | null = null
    const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
    if (savedData) {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } else {
      const lastSavedProjectId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)
      if (lastSavedProjectId) {
        let project: LocalProject | null = null
        if (Capacitor.isNativePlatform()) {
          const deviceProjects = await listDeviceProjects()
          project = deviceProjects.find((p) => p.id === lastSavedProjectId && p.type === 'walls_3') || null
        } else {
          project = getLocalProject(lastSavedProjectId) as Extract<LocalProject, { type: 'walls_3' }> | null
        }
        if (project && project.type === 'walls_3') {
          const d = project.data
          projectData = { name: project.name, material: d.material, principle: d.principle, left: d.left, back: d.back, right: d.right, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
        }
      }
    }
    const hasWalls3 = !!projectData && Number(projectData.left ?? 0) > 0 && Number(projectData.back ?? 0) > 0 && Number(projectData.right ?? 0) > 0 && Number(projectData.height ?? 0) > 0 && Number(projectData.thickness ?? 0) > 0
    let hasFoundation3 = false
    const foundationRawForCheck = sessionStorage.getItem('currentProjectData_foundation_3')
    if (foundationRawForCheck) {
      try {
        const f = JSON.parse(foundationRawForCheck) as Record<string, unknown>
        if (Number(f.left ?? 0) > 0 && Number(f.back ?? 0) > 0 && Number(f.right ?? 0) > 0 && Number(f.height ?? 0) > 0 && Number(f.thickness ?? 0) > 0) hasFoundation3 = true
      } catch {
        // ignore
      }
    }
    let hasRoof3 = false
    const roofRaw3Check = sessionStorage.getItem('currentProjectData_roof_3')
    if (roofRaw3Check) {
      try {
        const r = JSON.parse(roofRaw3Check) as Record<string, number>
        if (Number(r.left ?? 0) > 0 && Number(r.back ?? 0) > 0 && Number(r.right ?? 0) > 0) hasRoof3 = true
      } catch {
        // ignore
      }
    }
    if (!hasWalls3 && !hasFoundation3 && !hasRoof3) {
      setToast('Заполните хотя бы один раздел: фундамент, стены или крышу')
      setTimeout(() => setToast(null), 3000)
      return false
    }
    const trimmedName = (projectName.trim() || String(projectData?.name ?? 'Проект')).trim()
    let projectId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)?.trim() || makeProjectId()
    const duplicate3 = await findDuplicateByNameAndType(trimmedName, 'walls_3', projectId)
    if (duplicate3) {
      if (!window.confirm(`Проект с названием «${trimmedName}» уже существует (пристрой 3 стены). Перезаписать существующий проект?`)) return false
      projectId = duplicate3.id
    }
    setToast('Сохранение проекта...')
    try {
      await persistProjectFromStorageWalls3(projectId)
    } catch (e) {
      if (e instanceof Error && e.message === 'DUPLICATE_PROJECT_NAME') {
        setToast('Проект с таким названием уже существует')
        setTimeout(() => setToast(null), 3000)
        return false
      }
      throw e
    }
    setToast('Создание PDF...')
    const result = await generateAndStorePdfWalls3(projectId)
    if (!result) return false
    const base64Data = sessionStorage.getItem('pdfViewerPdfBytes') || ''
    const metaRaw = sessionStorage.getItem('pdfViewerPdfData')
    const meta = metaRaw ? (JSON.parse(metaRaw) as { projectName: string; projectType: string; materialLabel: string; principleLabel: string }) : { projectName: trimmedName, projectType: 'walls_3', materialLabel: MATERIALS[String(projectData?.material ?? '')] || 'Не выбран', principleLabel: projectData?.principle === 'inside' ? 'Внутри' : 'Снаружи' }
    const filePath = sessionStorage.getItem('pdfViewerFilePath') || undefined
    savePdfToStorageAndState(result.uri, result.filename, base64Data, meta, filePath)
    setToast(null)
    if (openViewer) router.push(`/pdf-viewer?uri=${encodeURIComponent(result.uri)}&filename=${encodeURIComponent(result.filename)}`)
    return true
  }

  const handleSavePdfWalls4 = async (openViewer: boolean): Promise<boolean> => {
    let projectData: Record<string, unknown> | null = null
    const savedData = sessionStorage.getItem(`currentProjectData${suffix}`)
    if (savedData) {
      projectData = JSON.parse(savedData) as Record<string, unknown>
    } else {
      const lastSavedProjectId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)
      if (lastSavedProjectId) {
        let project: LocalProject | null = null
        if (Capacitor.isNativePlatform()) {
          const deviceProjects = await listDeviceProjects()
          project = deviceProjects.find((p) => p.id === lastSavedProjectId && p.type === 'walls_4') || null
        } else {
          project = getLocalProject(lastSavedProjectId) as Extract<LocalProject, { type: 'walls_4' }> | null
        }
        if (project && project.type === 'walls_4') {
          const d = project.data
          projectData = { name: project.name, material: d.material, principle: d.principle, width: d.width, length: d.length, height: d.height, thickness: d.thickness, openings: d.openings, note: d.note }
        }
      }
    }
    const hasWalls4 = !!projectData && Number(projectData.width ?? 0) > 0 && Number(projectData.length ?? 0) > 0 && Number(projectData.height ?? 0) > 0 && Number(projectData.thickness ?? 0) > 0
    let hasFoundation4 = false
    const foundationRaw4Check = sessionStorage.getItem('currentProjectData_foundation_4')
    if (foundationRaw4Check) {
      try {
        const f = JSON.parse(foundationRaw4Check) as Record<string, unknown>
        if (Number(f.length ?? 0) > 0 && Number(f.width ?? 0) > 0 && Number(f.height ?? 0) > 0 && Number(f.thickness ?? 0) > 0) hasFoundation4 = true
      } catch {
        // ignore
      }
    }
    let hasRoof4 = false
    const roofRaw4Check = sessionStorage.getItem('currentProjectData_roof_4')
    if (roofRaw4Check) {
      try {
        const r = JSON.parse(roofRaw4Check) as Record<string, number>
        if (Number(r.width ?? 0) > 0 && Number(r.length ?? 0) > 0) hasRoof4 = true
      } catch {
        // ignore
      }
    }
    if (!hasWalls4 && !hasFoundation4 && !hasRoof4) {
      setToast('Заполните хотя бы один раздел: фундамент, стены или крышу')
      setTimeout(() => setToast(null), 3000)
      return false
    }
    const trimmedName = (projectName.trim() || String(projectData?.name ?? 'Проект')).trim()
    let projectId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)?.trim() || makeProjectId()
    const duplicate4 = await findDuplicateByNameAndType(trimmedName, 'walls_4', projectId)
    if (duplicate4) {
      if (!window.confirm(`Проект с названием «${trimmedName}» уже существует (отдельная постройка 4 стены). Перезаписать существующий проект?`)) return false
      projectId = duplicate4.id
    }
    setToast('Сохранение проекта...')
    try {
      await persistProjectFromStorageWalls4(projectId)
    } catch (e) {
      if (e instanceof Error && e.message === 'DUPLICATE_PROJECT_NAME') {
        setToast('Проект с таким названием уже существует')
        setTimeout(() => setToast(null), 3000)
        return false
      }
      throw e
    }
    setToast('Создание PDF...')
    const result = await generateAndStorePdfWalls4(projectId)
    if (!result) return false
    const base64Data = sessionStorage.getItem('pdfViewerPdfBytes') || ''
    const metaRaw = sessionStorage.getItem('pdfViewerPdfData')
    const meta = metaRaw ? (JSON.parse(metaRaw) as { projectName: string; projectType: string; materialLabel: string; principleLabel: string }) : { projectName: trimmedName, projectType: 'walls_4', materialLabel: MATERIALS[String(projectData?.material ?? '')] || 'Не выбран', principleLabel: projectData?.principle === 'inside' ? 'Внутри' : 'Снаружи' }
    const filePath = sessionStorage.getItem('pdfViewerFilePath') || undefined
    savePdfToStorageAndState(result.uri, result.filename, base64Data, meta, filePath)
    setToast(null)
    if (openViewer) router.push(`/pdf-viewer?uri=${encodeURIComponent(result.uri)}&filename=${encodeURIComponent(result.filename)}`)
    return true
  }

  const hasAnySectionData = !!(foundationResult || wallsResult || roofResult)
  const isSaveProjectActive = isDirty

  const handleSaveProject = useCallback(async () => {
    const trimmedName = (projectName.trim() || 'Проект').trim()
    if (!trimmedName) {
      setToast('Введите название проекта')
      setTimeout(() => setToast(null), 2500)
      return
    }
    sessionStorage.setItem(`currentProjectName${suffix}`, trimmedName)
    const lastSavedId = sessionStorage.getItem(`lastSavedProjectId${suffix}`)?.trim() || ''
    const duplicate = await findDuplicateByNameAndType(trimmedName, projectType, lastSavedId)
    if (duplicate) {
      setSaveDuplicateModal({ duplicate })
      return
    }

    let currentCount = 0
    let isUpdate = false
    if (Capacitor.isNativePlatform()) {
      try {
        const deviceList = await listDeviceProjects()
        currentCount = deviceList.length
        isUpdate = !!lastSavedId && deviceList.some((p) => p.id === lastSavedId)
      } catch {
        currentCount = 0
      }
    } else {
      const localList = listLocalProjects().filter((p) => p.platform !== 'android')
      currentCount = localList.length
      isUpdate = !!lastSavedId && localList.some((p) => p.id === lastSavedId)
    }
    if (!isUpdate && currentCount >= PROJECTS_LIMIT) {
      setToast(`Достигнут лимит проектов (${PROJECTS_LIMIT}). Удалите проект, чтобы сохранить новый.`)
      setTimeout(() => setToast(null), 5000)
      return
    }

    setToast('Сохранение...')
    try {
      ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
      try {
        if (projectType === 'walls_2') {
          await persistProjectFromStorageWalls2()
        } else if (projectType === 'walls_3') {
          await persistProjectFromStorageWalls3()
        } else {
          await persistProjectFromStorageWalls4()
        }
      } finally {
        ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
      }
      sessionStorage.setItem('projectIsDirty', 'false')
      setIsDirty(false)
      window.dispatchEvent(new CustomEvent('projectIsDirtyChanged'))
      setToast('Проект сохранён')
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'DUPLICATE_PROJECT_NAME') {
        setToast('Проект с таким названием уже существует')
      } else {
        setToast(msg || 'Ошибка сохранения')
      }
    }
    setTimeout(() => setToast(null), 3000)
  }, [projectType, suffix, projectName])

  const onConfirmSaveOverwrite = useCallback(async () => {
    if (!saveDuplicateModal?.duplicate) {
      setSaveDuplicateModal(null)
      return
    }
    const { duplicate } = saveDuplicateModal
    setSaveDuplicateModal(null)
    setToast('Сохранение...')
    try {
      ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
      try {
        if (projectType === 'walls_2') {
          await persistProjectFromStorageWalls2(duplicate.id)
        } else if (projectType === 'walls_3') {
          await persistProjectFromStorageWalls3(duplicate.id)
        } else {
          await persistProjectFromStorageWalls4(duplicate.id)
        }
      } finally {
        ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
      }
      sessionStorage.setItem('projectIsDirty', 'false')
      setIsDirty(false)
      window.dispatchEvent(new CustomEvent('projectIsDirtyChanged'))
      setToast('Проект перезаписан')
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Ошибка сохранения')
    }
    setTimeout(() => setToast(null), 3000)
  }, [saveDuplicateModal, projectType])

  const handleBack = useCallback(() => {
    if (isPdfButtonActive && isDirty) {
      setShowSaveBeforeExitModal(true)
    } else {
      goBack()
    }
  }, [goBack, isDirty, isPdfButtonActive])

  useAndroidBackHandler(() => {
    if (showSaveBeforeExitModal) {
      setShowSaveBeforeExitModal(false)
      return
    }

    handleBack()
  })

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f14] font-sans text-white pt-safe">
      <header className="border-b border-white/8 bg-[#10161f]">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#1a2230] px-3 py-2.5 text-sm font-medium text-white"
            >
              <BackIcon className="h-5 w-5" aria-label="Назад" />
            </button>
            <h1 className="max-w-[70%] truncate text-xl font-semibold tracking-[-0.02em] text-white">{title}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mt-0">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Название проекта</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => {
              const nextName = e.target.value
              setProjectName(nextName)
              sessionStorage.setItem(`currentProjectName${suffix}`, nextName)
              sessionStorage.setItem('projectIsDirty', 'true')
              window.dispatchEvent(new CustomEvent('projectDataChanged'))
            }}
            placeholder="Введите название проекта"
            className="android-field"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => handleContinue('foundation')}
            className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
          >
            <img src="/projects/create/foundation.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
            <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
              <div className="flex items-center gap-2">
                <FoundationIcon className="h-6 w-6 shrink-0 text-white" />
                <span className="text-base font-semibold text-white drop-shadow-sm">Фундамент</span>
              </div>
              {(foundationResult || foundationVolumeOverride != null) && (
                <span className="text-xs font-normal text-zinc-300">
                  {(foundationVolumeOverride ?? foundationResult?.volume ?? 0).toFixed(2).replace('.', ',')} м³
                </span>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleContinue('walls')}
            className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
          >
            <img src="/projects/create/walls.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
            <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
              <div className="flex items-center gap-2">
                <WallsIcon className="h-6 w-6 shrink-0 text-white" />
                <span className="text-base font-semibold text-white drop-shadow-sm">Стены</span>
              </div>
              {(wallsResult || wallsAreaOverride != null || wallsVolumeOverride != null) && (
                <span className="text-center text-xs font-normal text-zinc-300">
                  {(wallsAreaOverride ?? wallsResult?.area ?? 0).toFixed(2).replace('.', ',')} м² · {(wallsVolumeOverride ?? wallsResult?.volume ?? 0).toFixed(2).replace('.', ',')} м³
                </span>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleContinue('roof')}
            className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
          >
            <img src="/projects/create/roof.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
            <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
              <div className="flex items-center gap-2">
                <RoofIcon className="h-6 w-6 shrink-0 text-white" />
                <span className="text-base font-semibold text-white drop-shadow-sm">Крыша</span>
              </div>
              {(roofResult || roofAreaOverride != null) && (
                <span className="text-xs font-normal text-zinc-300">
                  {(roofAreaOverride ?? roofResult?.area ?? 0).toFixed(2).replace('.', ',')} м²
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="android-panel mt-6 p-4">
          <h3 className="text-base font-semibold text-white">Дополнительно</h3>
          <p className="mt-1 text-xs text-zinc-400">Комментарий попадёт в PDF, заметки — только для себя</p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Комментарий в PDF</label>
              <textarea
                value={pdfComment}
                onChange={(e) => {
                  setPdfComment(e.target.value)
                  sessionStorage.setItem(`pdfComment${suffix}`, e.target.value)
                  sessionStorage.setItem('projectIsDirty', 'true')
                  window.dispatchEvent(new CustomEvent('projectDataChanged'))
                }}
                inputMode="text"
                autoComplete="off"
                placeholder="Например: учесть запас 5% на отходы..."
                className="android-field min-h-[88px] text-sm"
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Заметки (только для себя)</label>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  sessionStorage.setItem(`notes${suffix}`, e.target.value)
                  sessionStorage.setItem('projectIsDirty', 'true')
                  window.dispatchEvent(new CustomEvent('projectDataChanged'))
                }}
                inputMode="text"
                autoComplete="off"
                placeholder="Напоминания, контакты, даты..."
                className="android-field min-h-[88px] text-sm"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 pb-safe">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <button
              type="button"
              onClick={() => void handleSaveProject()}
              disabled={!isSaveProjectActive}
              aria-label={isSaveProjectActive ? 'Сохранить проект' : 'Нет изменений для сохранения'}
              aria-disabled={!isSaveProjectActive}
              className={`inline-flex items-center justify-center gap-2 w-full rounded-xl px-6 py-4 text-base font-semibold transition-colors sm:flex-1 min-h-[48px] touch-manipulation ${
                isSaveProjectActive
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700'
                  : 'cursor-not-allowed bg-white/10 text-zinc-500'
              }`}
            >
              Сохранить проект
            </button>
            <button
              type="button"
              onClick={() => {
                if (savedPdfUri && !isDirty) {
                  openSavedPdf()
                } else {
                  void handleSavePdf(true)
                }
              }}
              disabled={!isPdfButtonActive}
              aria-label={isPdfButtonActive ? 'Создать PDF' : 'Введите название проекта для создания PDF'}
              aria-disabled={!isPdfButtonActive}
              className={`inline-flex items-center justify-center gap-2 w-full rounded-xl px-6 py-4 text-base font-semibold transition-colors sm:flex-1 min-h-[48px] touch-manipulation ${
                isPdfButtonActive
                  ? 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700'
                  : 'cursor-not-allowed bg-white/10 text-zinc-500'
              }`}
            >
              <DownloadIcon className="h-5 w-5" aria-hidden />
              Создать PDF
            </button>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={includePdfMeta}
              onChange={(e) => {
                setIncludePdfMeta(e.target.checked)
                sessionStorage.setItem(`includePdfMeta${suffix}`, String(e.target.checked))
                sessionStorage.setItem('projectIsDirty', 'true')
                window.dispatchEvent(new CustomEvent('projectDataChanged'))
              }}
              className="android-checkbox"
            />
            Подписать PDF
          </label>
          {!isPdfButtonActive && (
            <p className="mt-2 text-center text-sm text-zinc-400">Введите название проекта для создания PDF</p>
          )}
          {isPdfButtonActive && !isPdfSaved && !foundationResult && !wallsResult && !roofResult && (
            <p className="mt-2 text-center text-sm text-zinc-400">Заполните хотя бы один раздел: фундамент, стены или крышу</p>
          )}
        </div>
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2">
          <div className="android-toast text-sm">{toast}</div>
        </div>
      )}

      {saveDuplicateModal && (
        <ConfirmModal
          isOpen
          onClose={() => setSaveDuplicateModal(null)}
          onConfirm={() => void onConfirmSaveOverwrite()}
          title="Проект с таким именем уже существует"
          description={`Другой проект с именем «${saveDuplicateModal.duplicate.name}» уже есть. Сохранить текущие данные поверх него (старые данные будут заменены)?`}
          confirmLabel="Перезаписать"
          cancelLabel="Отмена"
        />
      )}

      {showSaveBeforeExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowSaveBeforeExitModal(false)}
          />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-[24px] bg-[#141a22] p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-white">Сохранить перед выходом?</h2>
            <p className="mb-6 text-base text-zinc-300">
              Есть несохранённые изменения. Сохранить проект и PDF, затем выйти?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSaveBeforeExitModal(false)
                  goBack()
                }}
                className="flex-1 rounded-2xl bg-[#10161f] px-4 py-3 text-base font-semibold text-white"
              >
                Выйти без сохранения
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await handleSavePdf(false)
                  if (ok) {
                    setShowSaveBeforeExitModal(false)
                    goBack()
                  }
                }}
                className="flex-1 rounded-2xl bg-[#2f6fed] px-4 py-3 text-base font-semibold text-white"
              >
                Сохранить и выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
