'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Maximize2, Pencil } from 'lucide-react'
import { makeProjectId, upsertLocalProject, listLocalProjects, type LocalProject, type Opening, type Principle } from '@/lib/projects/localProjects'
import { getFoundationRoofOverridesFromStorage, setWallsOverridesInStorage } from '@/lib/projects/resultOverridesStorage'
import { saveProjectToDevice, listDeviceProjects } from '@/lib/projects/deviceProjects'
import { Capacitor } from '@capacitor/core'
import { getWalls4PdfExtrasFromStorage } from '@/lib/pdf/getWalls4PdfExtras'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'

type Props = {
  mode: 'create' | 'edit'
  projectId?: string
  initialProject?: Extract<LocalProject, { type: 'walls_4' }>
  /** При true не показывать шапку (используется на странице просмотра с вкладками) */
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
  /** При изменении проёмов (добавление/удаление) — чтобы проект и большая визуализация получали актуальные данные */
  onOpeningsChange?: (openings: Opening[]) => void
}

type MaterialOption = { value: string; label: string }

const MATERIALS: MaterialOption[] = [
  { value: '', label: 'Выберите материал' },
  { value: 'brick_m100', label: 'Кирпич (M100)' },
  { value: 'brick_m150', label: 'Кирпич (M150)' },
  { value: 'concrete_m200', label: 'Бетон (M200)' },
  { value: 'concrete_m300', label: 'Бетон (M300)' },
  { value: 'polystyrene_concrete_d400', label: 'Полистиролбетон (D400)' },
  { value: 'polystyrene_concrete_d500', label: 'Полистиролбетон (D500)' },
  { value: 'wood_pine', label: 'Дерево (Сосна)' },
  { value: 'wood_larch', label: 'Дерево (Лиственница)' },
]

function clampNonNeg(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function format2(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function formatRu(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return v.toFixed(2).replace('.', ',')
}

function parseRuDecimal(value: string) {
  const cleaned = value.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function sanitizeRuDecimalInput(raw: string, maxDecimals = 2) {
  const filtered = raw.replace(/[^\d,\.]/g, '')
  const firstSepIdx = filtered.search(/[.,]/)
  const sep = firstSepIdx >= 0 ? filtered[firstSepIdx] : null
  const intPartRaw = (sep ? filtered.slice(0, firstSepIdx) : filtered).replace(/[.,]/g, '')
  const rest = sep ? filtered.slice(firstSepIdx + 1) : ''
  const decRaw = rest.replace(/[.,]/g, '')

  let intPart = intPartRaw.replace(/^0+(?=\d)/, '')
  if (intPart === '' && (raw.includes(',') || raw.includes('.') || raw.startsWith(',') || raw.startsWith('.'))) intPart = '0'

  let out = intPart
  if (sep) {
    const dec = decRaw.slice(0, maxDecimals)
    out = `${intPart}${sep}${dec}`
    if (dec.length === 0 && (raw.endsWith(',') || raw.endsWith('.'))) out = `${intPart}${sep}`
  }
  return out
}

// Читаем из sessionStorage при монтировании (как у Фундамента), чтобы значения не терялись при переключении обзор ↔ Стены (и при создании, и при просмотре)
function readWalls4InitFromStorage(mode: string, projectId?: string, initialProjectId?: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('currentProjectData_walls_4')
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if (mode === 'edit') {
      const activeId = projectId ?? initialProjectId ?? ''
      if (activeId && String(data.projectId || '') !== activeId) return null
    }
    const w = Number(data.width ?? 0), len = Number(data.length ?? 0), h = Number(data.height ?? 0), t = Number(data.thickness ?? 0)
    if (w > 0 || len > 0 || h > 0 || t > 0 || (data.name && String(data.name).trim()) || (data.material && String(data.material))) return data
    return null
  } catch {
    return null
  }
}

export default function Walls4Calculator({ mode, projectId, initialProject, embedInView, onSchemaClick, onOpeningsChange }: Props) {
  const router = useRouter()
  const init = initialProject?.data
  const storageInit = useMemo(() => readWalls4InitFromStorage(mode, projectId, initialProject?.id), [mode, projectId, initialProject?.id])

  const [toast, setToast] = useState<string | null>(null)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)
  const [isMaterialOpen, setIsMaterialOpen] = useState(false)
  const [overwriteModalProject, setOverwriteModalProject] = useState<LocalProject | null>(null)
  const [, setPendingSave] = useState<boolean>(false)
  const [isProjectSaved, setIsProjectSaved] = useState<boolean>(!!initialProject)
  const [currentProjectId, setCurrentProjectId] = useState<string>(projectId ?? initialProject?.id ?? '') // ID текущего проекта
  const [principle, setPrinciple] = useState<Principle>((storageInit?.principle as Principle) ?? init?.principle ?? 'inside')
  const [projectName, setProjectName] = useState(String(storageInit?.name ?? initialProject?.name ?? ''))
  const [material, setMaterial] = useState(String(storageInit?.material ?? init?.material ?? ''))
  const [pdfComment, setPdfComment] = useState(initialProject?.pdfComment ?? '')
  const [, setNotes] = useState(initialProject?.notes ?? '')

  // 4 walls (rectangle): keep side selection like 2-walls: width + length only
  const [activeWall, setActiveWall] = useState<1 | 2>(1)

  const [widthText, setWidthText] = useState(() => {
    const v = storageInit ? Number(storageInit.width ?? 0) : (init?.width ?? 0)
    return v > 0 ? formatRu(v) : (init && init.width !== 0 ? formatRu(init.width) : '')
  })
  const [lengthText, setLengthText] = useState(() => {
    const v = storageInit ? Number(storageInit.length ?? 0) : (init?.length ?? 0)
    return v > 0 ? formatRu(v) : (init && init.length !== 0 ? formatRu(init.length) : '')
  })

  const [width, setWidth] = useState(storageInit ? Number(storageInit.width ?? 0) : (init?.width ?? 0))
  const [length, setLength] = useState(storageInit ? Number(storageInit.length ?? 0) : (init?.length ?? 0))

  const [heightText, setHeightText] = useState(() => {
    const v = storageInit ? Number(storageInit.height ?? 0) : (init?.height ?? 0)
    return v > 0 ? formatRu(v) : (init && init.height !== 0 ? formatRu(init.height) : '')
  })
  const [thicknessText, setThicknessText] = useState(() => {
    const v = storageInit ? Number(storageInit.thickness ?? 0) : (init?.thickness ?? 0)
    return v > 0 ? formatRu(v) : (init && init.thickness !== 0 ? formatRu(init.thickness) : '')
  })
  const [height, setHeight] = useState(storageInit ? Number(storageInit.height ?? 0) : (init?.height ?? 0))
  const [thickness, setThickness] = useState(storageInit ? Number(storageInit.thickness ?? 0) : (init?.thickness ?? 0))

  const widthRef = useRef<HTMLInputElement | null>(null)
  const lengthRef = useRef<HTMLInputElement | null>(null)
  const hasMountedRef = useRef(false)
  const embedInViewRef = useRef(embedInView)
  embedInViewRef.current = embedInView
  /** В edit: не ставить dirty при следующем запуске persist (после восстановления из sessionStorage) */
  const skipDirtyAfterRestoreRef = useRef(false)
  // Стабильный ID черновика (нужен, чтобы можно было удалить его при "выйти без сохранения")
  const draftIdRef = useRef<string>('')
  // Жёсткая защита от автосохранения: сохраняем проект ТОЛЬКО при явном действии пользователя.
  const userInitiatedSaveRef = useRef(false)

  const runUserInitiatedSave = async <T,>(fn: () => Promise<T>): Promise<T> => {
    userInitiatedSaveRef.current = true
    ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
    try {
      return await fn()
    } finally {
      userInitiatedSaveRef.current = false
      ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
    }
  }

  const [openings, setOpenings] = useState<Opening[]>(Array.isArray(storageInit?.openings) ? (storageInit.openings as Opening[]) : (init?.openings ?? []))
  const [isAddingOpening, setIsAddingOpening] = useState(false)
  const [openingWidthText, setOpeningWidthText] = useState('')
  const [openingHeightText, setOpeningHeightText] = useState('')
  const [includePdfMeta] = useState(false)
  const [note, setNote] = useState(String(storageInit?.note ?? init?.note ?? ''))
  const [resultsOverrides, setResultsOverrides] = useState<{ wallsArea?: number; wallsVolume?: number }>(initialProject?.resultsOverrides ?? {})
  const [editingResult, setEditingResult] = useState<'wallsArea' | 'wallsVolume' | null>(null)
  const [editResultValue, setEditResultValue] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    setWallsOverridesInStorage('4', resultsOverrides)
    const initialOverrides = initialProject?.resultsOverrides ?? {}
    const overridesChanged = JSON.stringify(resultsOverrides) !== JSON.stringify(initialOverrides)
    if (overridesChanged) {
      sessionStorage.setItem('projectIsDirty', 'true')
      window.dispatchEvent(new CustomEvent('projectDataChanged'))
    }
  }, [resultsOverrides, initialProject?.resultsOverrides, embedInView])

  useEffect(() => {
    if (typeof window === 'undefined' || initialProject) return
    const sComment = sessionStorage.getItem('pdfComment_walls_4')
    const sNotes = sessionStorage.getItem('notes_walls_4')
    if (sComment != null) setPdfComment(sComment)
    if (sNotes != null) setNotes(sNotes)
  }, [initialProject])

  const dims = useMemo(() => {
    return {
      width: clampNonNeg(width),
      length: clampNonNeg(length),
      height: clampNonNeg(height),
      thickness: clampNonNeg(thickness),
    }
  }, [width, length, height, thickness])

  // Сохраняем черновик и изменения в sessionStorage для восстановления при возврате и для большой визуализации.
  // В embedInView всегда пишем в sessionStorage (чтобы большая визуализация видела данные), но не диспатчим projectDataChanged (чтобы не было цикла).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const activeProjectId = currentProjectId || projectId || initialProject?.id || ''
    const hasData =
      dims.width > 0 ||
      dims.length > 0 ||
      dims.height > 0 ||
      dims.thickness > 0 ||
      projectName.trim() !== '' ||
      material !== '' ||
      openings.length > 0
    if (!hasData) return
    const projectData = {
      projectId: activeProjectId,
      name: projectName.trim() || 'Проект',
      material,
      principle,
      width: dims.width,
      length: dims.length,
      height: dims.height,
      thickness: dims.thickness,
      openings,
      note,
    }
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      sessionStorage.setItem('currentProjectData_walls_4', JSON.stringify(projectData))
      // При первом вводе в режиме просмотра помечаем dirty, чтобы при возврате на обзор не перезаписать storage сохранённым проектом
      if (embedInViewRef.current && mode === 'edit' && initialProject) {
        const initData = initialProject.data as { width?: number; length?: number; height?: number; thickness?: number; material?: string; principle?: string; openings?: unknown[]; note?: string }
        const dataChanged =
          (projectName.trim() || 'Проект') !== (initialProject.name?.trim() || 'Проект') ||
          material !== (initData?.material ?? '') ||
          principle !== (initData?.principle ?? 'inside') ||
          dims.width !== (initData?.width ?? 0) ||
          dims.length !== (initData?.length ?? 0) ||
          dims.height !== (initData?.height ?? 0) ||
          dims.thickness !== (initData?.thickness ?? 0) ||
          JSON.stringify(openings) !== JSON.stringify(initData?.openings ?? []) ||
          (note.trim() || '') !== (initData?.note ?? '')
        if (dataChanged) {
          sessionStorage.setItem('projectIsDirty', 'true')
          try {
            window.dispatchEvent(new CustomEvent('projectDataChanged'))
          } catch {}
        }
      }
      return
    }
    if (mode === 'edit' && skipDirtyAfterRestoreRef.current) {
      skipDirtyAfterRestoreRef.current = false
      sessionStorage.setItem('currentProjectData_walls_4', JSON.stringify(projectData))
      return
    }
    sessionStorage.setItem('currentProjectData_walls_4', JSON.stringify(projectData))
    if (!embedInViewRef.current) {
      if (mode === 'edit' && initialProject) {
        const init = initialProject.data as { width?: number; length?: number; height?: number; thickness?: number; material?: string; principle?: string; openings?: unknown[]; note?: string }
        const dataChanged =
          (projectName.trim() || 'Проект') !== (initialProject.name?.trim() || 'Проект') ||
          material !== (init?.material ?? '') ||
          principle !== (init?.principle ?? 'inside') ||
          dims.width !== (init?.width ?? 0) ||
          dims.length !== (init?.length ?? 0) ||
          dims.height !== (init?.height ?? 0) ||
          dims.thickness !== (init?.thickness ?? 0) ||
          JSON.stringify(openings) !== JSON.stringify(init?.openings ?? []) ||
          (note.trim() || '') !== (init?.note ?? '')
        if (!dataChanged) return
      }
      sessionStorage.setItem('projectIsDirty', 'true')
      try {
        window.dispatchEvent(new CustomEvent('projectDataChanged'))
      } catch {}
    }
  }, [mode, projectName, material, principle, dims.width, dims.length, dims.height, dims.thickness, openings, note, currentProjectId, projectId, initialProject, embedInView])

  // В режиме редактирования восстанавливаем последние изменения из sessionStorage
  useEffect(() => {
    if (mode !== 'edit' || typeof window === 'undefined') return
    const activeProjectId = currentProjectId || projectId || initialProject?.id || ''
    if (!activeProjectId) return
    const raw = sessionStorage.getItem('currentProjectData_walls_4')
    if (!raw) return
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      if (String(data.projectId || '') !== activeProjectId) return
      const w = Number(data.width ?? 0)
      const len = Number(data.length ?? 0)
      const h = Number(data.height ?? 0)
      const t = Number(data.thickness ?? 0)
      if (w > 0 || len > 0 || h > 0 || t > 0 || (data.name && String(data.name).trim()) || (data.material && String(data.material))) {
        skipDirtyAfterRestoreRef.current = true
        if (data.name != null) setProjectName(String(data.name))
        if (data.material != null) setMaterial(String(data.material))
        if (data.principle === 'inside' || data.principle === 'outside') setPrinciple(data.principle)
        setWidth(w)
        setLength(len)
        setHeight(h)
        setThickness(t)
        setWidthText(w > 0 ? formatRu(w) : '')
        setLengthText(len > 0 ? formatRu(len) : '')
        setHeightText(h > 0 ? formatRu(h) : '')
        setThicknessText(t > 0 ? formatRu(t) : '')
        if (Array.isArray(data.openings)) setOpenings(data.openings as Opening[])
        if (data.note != null) setNote(String(data.note))
      }
    } catch {
      // ignore
    }
  }, [mode, currentProjectId, projectId, initialProject])

  // В режиме создания: при монтировании восстанавливаем черновик из sessionStorage (как в walls-2)
  useEffect(() => {
    if (mode !== 'create' || initialProject || typeof window === 'undefined') return
    const raw = sessionStorage.getItem('currentProjectData_walls_4')
    if (!raw) return
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      const w = Number(data.width ?? 0)
      const len = Number(data.length ?? 0)
      const h = Number(data.height ?? 0)
      const t = Number(data.thickness ?? 0)
      if (w > 0 || len > 0 || h > 0 || t > 0 || (data.name && String(data.name).trim()) || (data.material && String(data.material))) {
        if (data.name != null) setProjectName(String(data.name))
        if (data.material != null) setMaterial(String(data.material))
        if (data.principle === 'inside' || data.principle === 'outside') setPrinciple(data.principle as 'inside' | 'outside')
        setWidth(w)
        setLength(len)
        setHeight(h)
        setThickness(t)
        setWidthText(w > 0 ? formatRu(w) : '')
        setLengthText(len > 0 ? formatRu(len) : '')
        setHeightText(h > 0 ? formatRu(h) : '')
        setThicknessText(t > 0 ? formatRu(t) : '')
        if (Array.isArray(data.openings)) setOpenings(data.openings as Opening[])
        if (data.note != null) setNote(String(data.note))
      }
    } catch {
      // ignore
    }
  }, [mode, initialProject])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ type: string }>).detail
      if (d?.type !== 'walls_4') return
      try {
        const raw = sessionStorage.getItem('currentProjectData_walls_4')
        if (!raw) return
        const data = JSON.parse(raw) as { openings?: Opening[] }
        if (Array.isArray(data.openings)) setOpenings(data.openings)
      } catch {
        // ignore
      }
    }
    window.addEventListener('wallsPlanClosed', handler)
    return () => window.removeEventListener('wallsPlanClosed', handler)
  }, [])

  // Синхронизация проёмов при сохранении из большой визуализации (onOpeningsChange → projectDataChanged)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      try {
        const raw = sessionStorage.getItem('currentProjectData_walls_4')
        if (!raw) return
        const data = JSON.parse(raw) as { openings?: Opening[] }
        if (Array.isArray(data.openings)) setOpenings(data.openings)
      } catch {
        // ignore
      }
    }
    window.addEventListener('projectDataChanged', handler)
    return () => window.removeEventListener('projectDataChanged', handler)
  }, [])

  const results = useMemo(() => {
    if (dims.width === 0 || dims.length === 0 || dims.height === 0) return null
    const t = dims.thickness
    // 4-walls volume rule:
    // inside: (width + t) and (length + t), then *2 (perimeter), *height, -openings, *thickness
    // outside: (width - t) and (length - t), then same
    const sign = principle === 'inside' ? 1 : -1
    const wSide = Math.max(0, dims.width + sign * t)
    const lSide = Math.max(0, dims.length + sign * t)
    const perimeter = 2 * (wSide + lSide)

    const openingsArea = openings.reduce((sum, o) => sum + clampNonNeg(o.width) * clampNonNeg(o.height), 0)
    const wallArea = Math.max(0, perimeter * dims.height - openingsArea)
    const volume = Math.max(0, wallArea * t)

    // Floor area (inside room)
    const areaInside =
      principle === 'inside'
        ? Math.max(0, dims.width * dims.length)
        : Math.max(0, Math.max(0, dims.width - 2 * t) * Math.max(0, dims.length - 2 * t))

    return { area: areaInside, volume }
  }, [dims, openings, principle])

  const materialLabel = MATERIALS.find((m) => m.value === material)?.label || 'Не выбран'
  const materialItems = MATERIALS.filter((m) => m.value !== '')

  // Требования для расчёта/создания PDF: достаточно размеров.
  // Название проекта и материал оставляем необязательными (подставим значения по умолчанию).
  const hasRequired =
    dims.width > 0 &&
    dims.length > 0 &&
    dims.height > 0 &&
    dims.thickness > 0

  const missingFields: string[] = []
  if (dims.width <= 0) missingFields.push('ширину')
  if (dims.length <= 0) missingFields.push('длину')
  if (dims.height <= 0) missingFields.push('высоту')
  if (dims.thickness <= 0) missingFields.push('толщину')
  const missingHint = missingFields.length ? `Введите: ${missingFields.join(', ')}` : 'Введите параметры стен'

  const currentId = currentProjectId || projectId || initialProject?.id || ''

  const getDraftId = () => {
    if (draftIdRef.current) return draftIdRef.current
    draftIdRef.current = currentId && currentId.trim() ? currentId : makeProjectId()
    return draftIdRef.current
  }

  const checkDuplicateName = async (name: string, excludeId: string): Promise<LocalProject | null> => {
    if (!name.trim()) return null
    
    const trimmedName = name.trim()
    const isAndroid = Capacitor.isNativePlatform()
    
    // Проверяем веб-проекты (дубликат = то же имя и тот же тип: 4 стены)
    const webProjects = listLocalProjects().filter(p => p.platform !== 'android')
    const webDuplicate = webProjects.find(p => p.type === 'walls_4' && p.name.trim() === trimmedName && p.id !== excludeId)
    if (webDuplicate) return webDuplicate
    
    // Проверяем Android-проекты (если на Android)
    if (isAndroid) {
      try {
        const deviceProjects = await listDeviceProjects()
        const deviceDuplicate = deviceProjects.find(p => p.type === 'walls_4' && p.name.trim() === trimmedName && p.id !== excludeId)
        if (deviceDuplicate) return deviceDuplicate
      } catch {
        // Игнорируем ошибки при чтении устройств
      }
    }
    
    return null
  }

  const persistProject = async (forceOverwrite = false, overwriteId?: string) => {
    if (!hasRequired) return null

    if (!userInitiatedSaveRef.current) {
      console.warn('[persistProject] BLOCKED: попытка автосохранения без явного действия пользователя')
      return null
    }
    
    const trimmedName = projectName.trim() || 'Проект'
    
    // Используем ID существующего проекта, если подтверждена перезапись
    let id = currentId && currentId.trim() ? currentId : getDraftId()
    if (forceOverwrite && overwriteId) {
      id = overwriteId
    }
    
    const now = new Date().toISOString()
    const isAndroid = Capacitor.isNativePlatform()
    const platform = isAndroid ? 'android' as const : 'web' as const

    let openingsToSave = openings
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('currentProjectData_walls_4')
        if (raw) {
          const parsed = JSON.parse(raw) as { openings?: Opening[] }
          if (Array.isArray(parsed.openings)) openingsToSave = parsed.openings
        }
      } catch {
        // ignore
      }
    }

    const pdfExtras = getWalls4PdfExtrasFromStorage()

    const p: LocalProject = {
      id,
      name: trimmedName,
      type: 'walls_4',
      createdAt: overwriteModalProject?.createdAt || initialProject?.createdAt || now,
      updatedAt: now,
      data: { principle, material, width: dims.width, length: dims.length, height: dims.height, thickness: dims.thickness, openings: openingsToSave, note: note.trim() || undefined },
      platform,
      pdfComment: (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pdfComment_walls_4') : null)?.trim() || initialProject?.pdfComment || undefined,
      notes: (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('notes_walls_4') : null)?.trim() || initialProject?.notes || undefined,
      ...(pdfExtras.foundation ? { foundation: pdfExtras.foundation } : {}),
      ...(pdfExtras.roof ? { roof: pdfExtras.roof } : {}),
      ...(Object.keys({ ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('4') }).length > 0 ? { resultsOverrides: { ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('4') } } : {}),
    }
    
    if (isAndroid) {
      await saveProjectToDevice(p).catch(() => undefined)
    } else {
      upsertLocalProject(p)
    }
    
    return p
  }

  // Отслеживаем изменения проекта для определения несохранённых изменений
  useEffect(() => {
    if (hasRequired) {
      const hasChanges = 
        projectName !== (initialProject?.name ?? '') ||
        material !== (init?.material ?? '') ||
        principle !== (init?.principle ?? 'inside') ||
        dims.width !== (init?.width ?? 0) ||
        dims.length !== (init?.length ?? 0) ||
        dims.height !== (init?.height ?? 0) ||
        dims.thickness !== (init?.thickness ?? 0) ||
        JSON.stringify(openings) !== JSON.stringify(init?.openings ?? []) ||
        (note.trim() || '') !== (init?.note ?? '') ||
        JSON.stringify(resultsOverrides) !== JSON.stringify(initialProject?.resultsOverrides ?? {})
      
      if (hasChanges && isProjectSaved) {
        setIsProjectSaved(false)
      }
    }
  }, [projectName, material, principle, dims.width, dims.length, dims.height, dims.thickness, openings, note, resultsOverrides, hasRequired, initialProject, init, isProjectSaved])

  // Перехватываем попытку закрыть страницу/покинуть проект
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Показываем предупреждение только если PDF не сохранён и проект не сохранён
      // Если PDF сохранён, значит проект уже сохранён, предупреждение не показываем
      if (!savedPdfUri && !isProjectSaved && hasRequired) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isProjectSaved, hasRequired, savedPdfUri])

  const makePdf = async () => {
    if (!hasRequired || !results) throw new Error('Введите параметры стен')
    
    const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
    const pdfExtras = getWalls4PdfExtrasFromStorage()
    let openingsForPdf = openings
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('currentProjectData_walls_4')
        if (raw) {
          const parsed = JSON.parse(raw) as { openings?: Opening[] }
          if (Array.isArray(parsed.openings)) openingsForPdf = parsed.openings
        }
      } catch {
        // ignore
      }
    }
    const comment = (typeof window !== 'undefined' ? sessionStorage.getItem('pdfComment_walls_4') : null)?.trim() || pdfComment.trim() || undefined
    const payload = {
      title: projectName.trim() || 'Проект строительства',
      includeMeta: includePdfMeta,
      materialLabel,
      principleLabel: principle === 'inside' ? 'Внутри' : 'Снаружи',
      dims,
      results,
      openings: openingsForPdf.map((o) => ({
        width: o.width,
        height: o.height,
        ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}),
        ...(o.wall != null ? { wall: o.wall } : {}),
      })),
      type: 'walls_4' as const,
      ...(pdfExtras.foundation ? { foundation: pdfExtras.foundation } : {}),
      ...(pdfExtras.roof ? { roof: pdfExtras.roof } : {}),
      ...(Object.keys({ ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('4') }).length > 0 ? { resultsOverrides: { ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('4') } } : {}),
      pdfComment: comment,
    }
    return await generatePdfWithPlanCapture('walls_4', payload)
  }

  const checkDuplicateAndSaveProject = async () => {
    const trimmedName = projectName.trim() || 'Проект'
    
    // Проверяем дубликаты перед сохранением проекта
    const duplicate = await checkDuplicateName(trimmedName, currentId)
    if (duplicate && duplicate.id !== currentId) {
      setOverwriteModalProject(duplicate)
      setPendingSave(true)
      return
    }
    
    // Нет дубликатов - сохраняем проект и PDF (сохранение проекта = сохранение PDF)
    const savedProject = await persistProject(false, undefined)
    if (savedProject) {
      setCurrentProjectId(savedProject.id)
      setIsProjectSaved(true)
      setToast('Проект сохранён')
      setTimeout(() => setToast(null), 2000)
      await savePdfOnly()
    } else {
      setToast('Ошибка: не удалось сохранить проект')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const saveProjectOnly = async (forceOverwrite = false, overwriteId?: string) => {
    try {
      if (forceOverwrite) {
        const savedProject = await persistProject(forceOverwrite, overwriteId)
        if (savedProject) {
          setCurrentProjectId(savedProject.id)
          setOverwriteModalProject(null)
          setPendingSave(false)
          setIsProjectSaved(true)
          setToast('Проект сохранён')
          setTimeout(() => setToast(null), 2000)
          await savePdfOnly()
        } else {
          setToast('Ошибка: не удалось сохранить проект')
          setTimeout(() => setToast(null), 3000)
        }
      } else {
        await checkDuplicateAndSaveProject()
      }
    } catch (error: unknown) {
      console.error('Ошибка при сохранении проекта:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сохранения проекта'
      setToast(errorMessage)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const savePdfOnly = async () => {
    try {
      const bytes = await makePdf()
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${projectName.trim() || 'Проект_строительства'}_${stamp}.pdf`
      const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
      const result = await savePdfToDevice(filename, bytes)
      if (result) {
        const uri = typeof result === 'string' ? result : result.uri
        const filePath = typeof result === 'string' ? undefined : result.path
        if (savedPdfUri && savedPdfUri.startsWith('blob:')) {
          URL.revokeObjectURL(savedPdfUri)
        }
        setSavedPdfUri(uri)
        setToast('PDF сохранён')
        setTimeout(() => setToast(null), 1500)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        const base64 = btoa(binary)
        sessionStorage.setItem('pdfViewerUri', uri)
        sessionStorage.setItem('pdfViewerFilename', filename)
        if (filePath) sessionStorage.setItem('pdfViewerFilePath', filePath)
        sessionStorage.setItem('pdfViewerPdfBytes', base64)
        sessionStorage.setItem('pdfViewerPdfData', JSON.stringify({
          projectName: projectName.trim() || 'Проект строительства',
          projectType: 'walls_4',
          materialLabel: materialItems.find(m => m.value === material)?.label || 'Не выбран',
          principleLabel: principle === 'inside' ? 'Внутри' : 'Снаружи',
        }))
      } else {
        throw new Error('Не удалось сохранить PDF')
      }
    } catch (error: unknown) {
      console.error('Ошибка при сохранении PDF:', error)
      setToast(error instanceof Error ? error.message : 'Ошибка сохранения PDF. Проверьте разрешения приложения на доступ к файлам.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- резерв для кнопки в UI
  const openSavedPdf = () => {
    if (!savedPdfUri) return
    const filename = sessionStorage.getItem('pdfViewerFilename') || `${projectName.trim() || 'Проект'}.pdf`
    router.push(`/pdf-viewer?uri=${encodeURIComponent(savedPdfUri)}&filename=${encodeURIComponent(filename)}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- резерв для кнопки в UI
  const downloadPdf = async () => {
    try {
      await runUserInitiatedSave(async () => saveProjectOnly())
      await new Promise(resolve => setTimeout(resolve, 50))
      if (overwriteModalProject) return
      await savePdfOnly()
    } catch (error: unknown) {
      console.error('[downloadPdf] Ошибка при сохранении:', error)
      setToast(error instanceof Error ? error.message : 'Ошибка при сохранении проекта или PDF')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleOverwriteConfirm = async () => {
    if (overwriteModalProject) {
      await runUserInitiatedSave(async () => saveProjectOnly(true, overwriteModalProject.id))
    }
  }

  const handleOverwriteCancel = () => {
    setOverwriteModalProject(null)
    setPendingSave(false)
  }

  // Очищаем URL при размонтировании компонента (только для веб-версии)
  useEffect(() => {
    return () => {
      if (savedPdfUri && savedPdfUri.startsWith('blob:')) {
        URL.revokeObjectURL(savedPdfUri)
      }
    }
  }, [savedPdfUri])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- резерв для кнопки в UI
  const openPdf = async () => {
    try {
      if (!hasRequired || !results) {
        setToast('Введите параметры стен')
        setTimeout(() => setToast(null), 2000)
        return
      }
      
      const bytes = await makePdf()
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${projectName.trim() || 'Проект_строительства'}_${stamp}.pdf`
      
      if (Capacitor.isNativePlatform()) {
        // На Android сохраняем PDF на устройство и открываем через нативный Intent (FileOpener)
        // pdf.js с worker не работает в Android WebView, поэтому используем стандартный способ
        const { savePdfToDevice, openPdfFromDevice } = await import('@/lib/pdf/pdfStorage')
        const result = await savePdfToDevice(filename, bytes)
        if (result) {
          const uri = typeof result === 'string' ? result : result.uri
          const filePath = typeof result === 'string' ? undefined : result.path
          await openPdfFromDevice(uri, bytes, { userInitiated: true, filePath })
        } else {
          throw new Error('Не удалось сохранить PDF на устройство')
        }
      } else {
        // В веб-версии открываем в новой вкладке
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }
    } catch (error: unknown) {
      console.error('Ошибка при открытии PDF:', error)
      setToast(error instanceof Error ? error.message : 'Не удалось открыть PDF')
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f14] font-sans text-white pt-safe">
      {!embedInView && (
        <header className="border-b border-white/8 bg-[#10161f]">
          <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <BackButton
                fallbackHref={mode === 'edit' ? '/project' : '/projects/create/walls-4'}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#1a2230] px-3 py-2.5 text-sm font-medium text-white"
              >
                <BackIcon className="h-5 w-5" aria-label="Назад" />
              </BackButton>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-white">Параметры стен</h1>
              <div className="h-12 w-12" />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-3 pb-8 sm:px-6">
        <div className="mt-1 rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
          <div className="space-y-5">
            <div>
              <button
                type="button"
                onClick={() => setIsMaterialOpen(true)}
                className="android-select text-sm"
              >
                <span className={material ? 'text-white' : 'text-zinc-500'}>{material ? materialLabel : 'Материал стены'}</span>
                <ChevronDown className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Принцип расчёта</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrinciple('inside')}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    principle === 'inside'
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-200'
                      : 'border-white/10 bg-[#10161f] text-zinc-200 hover:bg-[#141a22]'
                  }`}
                >
                  Внутри
                </button>
                <button
                  type="button"
                  onClick={() => setPrinciple('outside')}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    principle === 'outside'
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-200'
                      : 'border-white/10 bg-[#10161f] text-zinc-200 hover:bg-[#141a22]'
                  }`}
                >
                  Снаружи
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* mini visualization (same style as others) */}
        <div className="mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
          <div className="relative flex items-center justify-center">
            {onSchemaClick && (
              <button
                type="button"
                onClick={onSchemaClick}
                aria-label="Открыть план в масштабе"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            <svg viewBox="0 0 200 120" className="h-28 w-full max-w-md select-none rounded-[20px] border border-white/10 bg-[#10161f]">
              <rect width="200" height="120" fill="transparent" />
              {(() => {
                const w = Number.isFinite(dims.width) && dims.width > 0 ? dims.width : 1
                const l = Number.isFinite(dims.length) && dims.length > 0 ? dims.length : 1

                const scale = 60 / Math.max(w, l, 1)
                const wPx = w * scale
                const lPx = l * scale
                const thick = 4
                const LABEL_OFFSET = 18

                const activeFill = '#3b82f6'
                const inactiveFill = 'rgba(255,255,255,0.20)'
                const activeStroke = '#2563eb'
                const inactiveStroke = 'rgba(255,255,255,0.25)'

                // Rectangle placement (derived from width/length)
                const x0 = 60
                const y0 = 26
                const rectW = wPx
                const rectH = lPx

                const leftX = x0
                const rightX = x0 + rectW - thick
                const topY = y0
                const bottomY = y0 + rectH - thick

                const widthLabel = `${format2(dims.width)}`.replace('.', ',') + ' м'
                const lengthLabel = `${format2(dims.length)}`.replace('.', ',') + ' м'

                return (
                  <>
                    {/* length (top) */}
                    <rect
                      x={x0}
                      y={topY}
                      width={rectW}
                      height={thick}
                      rx={2}
                      fill={activeWall === 2 ? activeFill : inactiveFill}
                      stroke={activeWall === 2 ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(2)
                        lengthRef.current?.focus()
                      }}
                    />
                    {/* length (bottom) */}
                    <rect
                      x={x0}
                      y={bottomY}
                      width={rectW}
                      height={thick}
                      rx={2}
                      fill={activeWall === 2 ? activeFill : inactiveFill}
                      stroke={activeWall === 2 ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(2)
                        lengthRef.current?.focus()
                      }}
                    />
                    {/* width (left) */}
                    <rect
                      x={leftX}
                      y={topY}
                      width={thick}
                      height={rectH}
                      rx={2}
                      fill={activeWall === 1 ? activeFill : inactiveFill}
                      stroke={activeWall === 1 ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(1)
                        widthRef.current?.focus()
                      }}
                    />
                    {/* width (right) */}
                    <rect
                      x={rightX}
                      y={topY}
                      width={thick}
                      height={rectH}
                      rx={2}
                      fill={activeWall === 1 ? activeFill : inactiveFill}
                      stroke={activeWall === 1 ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(1)
                        widthRef.current?.focus()
                      }}
                    />

                    {/* length label above */}
                    <text
                      x={x0 + rectW / 2}
                      y={Math.max(12, topY - LABEL_OFFSET)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activeWall === 2 ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(2)
                        lengthRef.current?.focus()
                      }}
                    >
                      {lengthLabel}
                    </text>

                    {/* width label (rotated, left) */}
                    <text
                      x={leftX - LABEL_OFFSET}
                      y={topY + rectH / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activeWall === 1 ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${leftX - LABEL_OFFSET} ${topY + rectH / 2})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(1)
                        widthRef.current?.focus()
                      }}
                    >
                      {widthLabel}
                    </text>

                    {/* right label removed (left label is enough) */}
                  </>
                )
              })()}
            </svg>
          </div>
        </div>

        <div className="mt-3 rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="decimal"
                className="android-field text-sm"
                placeholder="Ширина (м)"
                value={widthText}
                ref={widthRef}
                onFocus={() => setActiveWall(1)}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setWidthText(t)
                  setWidth(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (widthText.trim() === '') return
                  setWidthText(formatRu(width))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="android-field text-sm"
                placeholder="Длина (м)"
                value={lengthText}
                ref={lengthRef}
                onFocus={() => setActiveWall(2)}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setLengthText(t)
                  setLength(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (lengthText.trim() === '') return
                  setLengthText(formatRu(length))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="android-field text-sm"
                placeholder="Высота (м)"
                value={heightText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setHeightText(t)
                  setHeight(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (heightText.trim() === '') return
                  setHeightText(formatRu(height))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="android-field text-sm"
                placeholder="Толщина (м)"
                value={thicknessText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setThicknessText(t)
                  setThickness(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (thicknessText.trim() === '') return
                  setThicknessText(formatRu(thickness))
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
          {openings.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {openings.map((o, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const next = openings.filter((_, i) => i !== idx)
                    setOpenings(next)
                    onOpeningsChange?.(next)
                  }}
                  className="android-chip text-sm hover:bg-[#141a22]"
                >
                  ({formatRu(o.width)}х{formatRu(o.height)})
                  <span className="text-zinc-400">×</span>
                </button>
              ))}
            </div>
          )}

          {isAddingOpening ? (
            <div className="android-panel-soft p-4">
              <p className="text-sm font-semibold text-white">Новый проём</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  className="android-field text-sm"
                  placeholder="Ширина (м)"
                  value={openingWidthText}
                  onChange={(e) => setOpeningWidthText(sanitizeRuDecimalInput(e.target.value, 2))}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  className="android-field text-sm"
                  placeholder="Высота (м)"
                  value={openingHeightText}
                  onChange={(e) => setOpeningHeightText(sanitizeRuDecimalInput(e.target.value, 2))}
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const w = clampNonNeg(parseRuDecimal(openingWidthText))
                    const h = clampNonNeg(parseRuDecimal(openingHeightText))
                    if (w <= 0 || h <= 0) {
                      setToast('Введите ширину и высоту проёма')
                      setTimeout(() => setToast(null), 2000)
                      return
                    }
                    const nextOpenings = [...openings, { wall: 1 as const, width: w, height: h, offset: Math.max(0, thickness) }]
                    setOpenings(nextOpenings)
                    onOpeningsChange?.(nextOpenings)
                    setOpeningWidthText('')
                    setOpeningHeightText('')
                    setIsAddingOpening(false)
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Добавить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpeningWidthText('')
                    setOpeningHeightText('')
                    setIsAddingOpening(false)
                  }}
                  className="android-btn-secondary text-sm font-semibold"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingOpening(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              + Добавить проём
            </button>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-transparent p-6">
          <h3 className="text-lg font-semibold text-white">Результат расчёта</h3>
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">
            <span>Принцип расчёта:</span>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-200">
              {principle === 'inside' ? 'Внутри' : 'Снаружи'}
            </span>
          </div>
          {!hasRequired || !results ? (
            <p className="mt-4 text-sm text-zinc-400">{missingHint}</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {(() => {
                const effectiveArea = resultsOverrides.wallsArea ?? results.area
                const effectiveVolume = resultsOverrides.wallsVolume ?? results.volume
                const commitEdit = (key: 'wallsArea' | 'wallsVolume') => {
                  const n = parseRuDecimal(editResultValue)
                  if (n >= 0) setResultsOverrides((prev) => ({ ...prev, [key]: n }))
                  else setResultsOverrides((prev) => ({ ...prev, [key]: undefined }))
                  setEditingResult(null)
                }
                return (
                  <>
                    <div className="android-panel-soft p-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-400">Площадь</p>
                        {resultsOverrides.wallsArea != null && (
                          <button
                            type="button"
                            onClick={() => { setResultsOverrides((p) => ({ ...p, wallsArea: undefined })) }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Сбросить к расчёту
                          </button>
                        )}
                      </div>
                      {editingResult === 'wallsArea' ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editResultValue}
                            onChange={(e) => setEditResultValue(sanitizeRuDecimalInput(e.target.value))}
                            onBlur={() => commitEdit('wallsArea')}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit('wallsArea') }}
                            className="android-field w-32 px-3 py-2 text-2xl font-bold"
                            autoFocus
                          />
                          <span className="text-2xl font-semibold text-white">м²</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingResult('wallsArea'); setEditResultValue(effectiveArea.toFixed(2).replace('.', ',')) }}
                          className="mt-1 flex items-center gap-2 text-left"
                        >
                          <p className="text-4xl font-bold text-white">
                            {effectiveArea.toFixed(2).replace('.', ',')} <span className="text-2xl font-semibold">м²</span>
                          </p>
                          <Pencil className="h-4 w-4 shrink-0 text-zinc-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                    <div className="android-panel-soft p-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-400">Объём</p>
                        {resultsOverrides.wallsVolume != null && (
                          <button
                            type="button"
                            onClick={() => { setResultsOverrides((p) => ({ ...p, wallsVolume: undefined })) }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Сбросить к расчёту
                          </button>
                        )}
                      </div>
                      {editingResult === 'wallsVolume' ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editResultValue}
                            onChange={(e) => setEditResultValue(sanitizeRuDecimalInput(e.target.value))}
                            onBlur={() => commitEdit('wallsVolume')}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit('wallsVolume') }}
                            className="android-field w-32 px-3 py-2 text-2xl font-bold"
                            autoFocus
                          />
                          <span className="text-2xl font-semibold text-white">м³</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingResult('wallsVolume'); setEditResultValue(effectiveVolume.toFixed(2).replace('.', ',')) }}
                          className="mt-1 flex items-center gap-2 text-left"
                        >
                          <p className="text-4xl font-bold text-white">
                            {effectiveVolume.toFixed(2).replace('.', ',')} <span className="text-2xl font-semibold">м³</span>
                          </p>
                          <Pencil className="h-4 w-4 shrink-0 text-zinc-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2">
          <div className="android-toast text-sm">{toast}</div>
        </div>
      )}

      {isMaterialOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={() => setIsMaterialOpen(false)} />
          <div className="android-sheet absolute inset-x-0 bottom-0 max-h-[70vh] overflow-auto rounded-t-2xl p-4">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-white">Выберите материал</p>
                <button type="button" onClick={() => setIsMaterialOpen(false)} className="android-btn-secondary text-sm font-semibold">
                  Закрыть
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {materialItems.map((m) => {
                  const selected = m.value === material
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMaterial(m.value)
                        setIsMaterialOpen(false)
                      }}
                      className="android-panel-soft flex w-full items-center justify-between px-4 py-4 text-left text-base text-white hover:bg-[#141a22]"
                    >
                      <span>{m.label}</span>
                      <span className={`h-5 w-5 rounded-full border ${selected ? 'border-blue-400 bg-blue-500' : 'border-white/30 bg-transparent'}`} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {overwriteModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={handleOverwriteCancel}
          />
          <div className="android-panel relative z-10 mx-4 w-full max-w-md p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Проект уже существует
            </h2>
            <p className="mb-6 text-base text-zinc-300">
              Проект с названием &quot;{overwriteModalProject.name}&quot; уже существует. 
              Вы хотите перезаписать существующий проект?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleOverwriteCancel}
                className="android-btn-secondary flex-1 text-base font-semibold"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={handleOverwriteConfirm}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700"
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}



