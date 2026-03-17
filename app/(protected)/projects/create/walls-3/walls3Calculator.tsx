'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Maximize2, Pencil } from 'lucide-react'
import { makeProjectId, upsertLocalProject, listLocalProjects, type LocalProject, type Opening, type Principle } from '@/lib/projects/localProjects'
import { getFoundationRoofOverridesFromStorage, setWallsOverridesInStorage } from '@/lib/projects/resultOverridesStorage'
import { saveProjectToDevice, listDeviceProjects } from '@/lib/projects/deviceProjects'
import { Capacitor } from '@capacitor/core'
import { BackButton, useAndroidBackHandler } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'

type Props = {
  mode: 'create' | 'edit'
  projectId?: string
  initialProject?: Extract<LocalProject, { type: 'walls_3' }>
  /** При true не показывать шапку (используется на странице просмотра с вкладками) */
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
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

function formatRu1(n: number) {
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

type Walls3InitDims = { left?: number; back?: number; right?: number; height?: number; thickness?: number; principle?: Principle; material?: string; openings?: Opening[]; note?: string }

// Читаем из sessionStorage при монтировании (как у Фундамента), чтобы значения не терялись при переключении обзор ↔ Стены (и при создании, и при просмотре)
function readWalls3InitFromStorage(mode: string, projectId?: string, initialProjectId?: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('currentProjectData_walls_3')
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if (mode === 'edit') {
      const activeId = projectId ?? initialProjectId ?? ''
      if (activeId && String(data.projectId || '') !== activeId) return null
    }
    const l = Number(data.left ?? 0), b = Number(data.back ?? 0), r = Number(data.right ?? 0), h = Number(data.height ?? 0), t = Number(data.thickness ?? 0)
    if (l > 0 || b > 0 || r > 0 || h > 0 || t > 0 || (data.name && String(data.name).trim()) || (data.material && String(data.material))) return data
    return null
  } catch {
    return null
  }
}

export default function Walls3Calculator({ mode, projectId, initialProject, embedInView, onSchemaClick }: Props) {
  const router = useRouter()
  const init = initialProject?.data as Walls3InitDims | undefined
  const storageInit = useMemo(() => readWalls3InitFromStorage(mode, projectId, initialProject?.id), [mode, projectId, initialProject?.id])

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

  // 3 walls (U-shape): left / back / right
  const [activeWall, setActiveWall] = useState<1 | 2 | 3>(2)
  const [leftText, setLeftText] = useState(() => {
    const v = storageInit ? Number(storageInit.left ?? 0) : (init?.left ?? 0)
    return v > 0 ? formatRu1(v) : (init && init.left !== 0 ? formatRu1(init.left ?? 0) : '')
  })
  const [backText, setBackText] = useState(() => {
    const v = storageInit ? Number(storageInit.back ?? 0) : (init?.back ?? 0)
    return v > 0 ? formatRu1(v) : (init && init.back !== 0 ? formatRu1(init.back ?? 0) : '')
  })
  const [rightText, setRightText] = useState(() => {
    const v = storageInit ? Number(storageInit.right ?? 0) : (init?.right ?? 0)
    return v > 0 ? formatRu1(v) : (init && init.right !== 0 ? formatRu1(init.right ?? 0) : '')
  })

  const [left, setLeft] = useState(storageInit ? Number(storageInit.left ?? 0) : (init?.left ?? 0))
  const [back, setBack] = useState(storageInit ? Number(storageInit.back ?? 0) : (init?.back ?? 0))
  const [right, setRight] = useState(storageInit ? Number(storageInit.right ?? 0) : (init?.right ?? 0))

  const [heightText, setHeightText] = useState(() => {
    const v = storageInit ? Number(storageInit.height ?? 0) : (init?.height ?? 0)
    return v > 0 ? formatRu1(v) : (init && init.height !== 0 ? formatRu1(init.height ?? 0) : '')
  })
  const [thicknessText, setThicknessText] = useState(() => {
    const v = storageInit ? Number(storageInit.thickness ?? 0) : (init?.thickness ?? 0)
    return v > 0 ? formatRu1(v) : (init && init.thickness !== 0 ? formatRu1(init.thickness ?? 0) : '')
  })
  const [height, setHeight] = useState(storageInit ? Number(storageInit.height ?? 0) : (init?.height ?? 0))
  const [thickness, setThickness] = useState(storageInit ? Number(storageInit.thickness ?? 0) : (init?.thickness ?? 0))

  const leftRef = useRef<HTMLInputElement | null>(null)
  const backRef = useRef<HTMLInputElement | null>(null)
  const rightRef = useRef<HTMLInputElement | null>(null)
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
    setWallsOverridesInStorage('3', resultsOverrides)
    const initialOverrides = initialProject?.resultsOverrides ?? {}
    const overridesChanged = JSON.stringify(resultsOverrides) !== JSON.stringify(initialOverrides)
    if (overridesChanged) {
      sessionStorage.setItem('projectIsDirty', 'true')
      window.dispatchEvent(new CustomEvent('projectDataChanged'))
    }
  }, [resultsOverrides, initialProject?.resultsOverrides, embedInView])

  // Загружаем комментарий и заметки из sessionStorage при монтировании (если нет initialProject — режим создания)
  useEffect(() => {
    if (typeof window === 'undefined' || initialProject) return
    const sComment = sessionStorage.getItem('pdfComment_walls_3')
    const sNotes = sessionStorage.getItem('notes_walls_3')
    if (sComment != null) setPdfComment(sComment)
    if (sNotes != null) setNotes(sNotes)
  }, [initialProject])

  const dims = useMemo(() => {
    return {
      left: clampNonNeg(left),
      back: clampNonNeg(back),
      right: clampNonNeg(right),
      height: clampNonNeg(height),
      thickness: clampNonNeg(thickness),
    }
  }, [left, back, right, height, thickness])

  // Сохраняем черновик и изменения в sessionStorage для восстановления при возврате и для большой визуализации (getProjectFromStorage).
  // Первый запуск с данными — только запись без dirty (просмотр сохранённого); последующие — с dirty.
  // В embedInView (страница просмотра) всегда пишем в sessionStorage (чтобы большая визуализация видела данные), но не диспатчим projectDataChanged (чтобы не было цикла).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const activeProjectId = currentProjectId || projectId || initialProject?.id || ''
    const hasData =
      dims.left > 0 ||
      dims.back > 0 ||
      dims.right > 0 ||
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
      left: dims.left,
      back: dims.back,
      right: dims.right,
      height: dims.height,
      thickness: dims.thickness,
      openings,
      note,
    }
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      sessionStorage.setItem('currentProjectData_walls_3', JSON.stringify(projectData))
      // При первом вводе в режиме просмотра помечаем dirty, чтобы при возврате на обзор (Фундамент/Стены/Крыша) не перезаписать storage сохранённым проектом
      if (embedInViewRef.current && mode === 'edit' && initialProject) {
        const init = initialProject.data as { left?: number; back?: number; right?: number; height?: number; thickness?: number; material?: string; principle?: string; openings?: unknown[]; note?: string }
        const dataChanged =
          (projectName.trim() || 'Проект') !== (initialProject.name?.trim() || 'Проект') ||
          material !== (init?.material ?? '') ||
          principle !== (init?.principle ?? 'inside') ||
          dims.left !== (init?.left ?? 0) ||
          dims.back !== (init?.back ?? 0) ||
          dims.right !== (init?.right ?? 0) ||
          dims.height !== (init?.height ?? 0) ||
          dims.thickness !== (init?.thickness ?? 0) ||
          JSON.stringify(openings) !== JSON.stringify(init?.openings ?? []) ||
          (note.trim() || '') !== (init?.note ?? '')
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
      sessionStorage.setItem('currentProjectData_walls_3', JSON.stringify(projectData))
      return
    }
    sessionStorage.setItem('currentProjectData_walls_3', JSON.stringify(projectData))
    if (!embedInViewRef.current) {
      if (mode === 'edit' && initialProject) {
        const init = initialProject.data as { left?: number; back?: number; right?: number; height?: number; thickness?: number; material?: string; principle?: string; openings?: unknown[]; note?: string }
        const dataChanged =
          (projectName.trim() || 'Проект') !== (initialProject.name?.trim() || 'Проект') ||
          material !== (init?.material ?? '') ||
          principle !== (init?.principle ?? 'inside') ||
          dims.left !== (init?.left ?? 0) ||
          dims.back !== (init?.back ?? 0) ||
          dims.right !== (init?.right ?? 0) ||
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
  }, [mode, projectName, material, principle, dims.left, dims.back, dims.right, dims.height, dims.thickness, openings, note, currentProjectId, projectId, initialProject, embedInView])

  // В режиме редактирования восстанавливаем последние изменения из sessionStorage
  useEffect(() => {
    if (mode !== 'edit' || typeof window === 'undefined') return
    const activeProjectId = currentProjectId || projectId || initialProject?.id || ''
    if (!activeProjectId) return
    const raw = sessionStorage.getItem('currentProjectData_walls_3')
    if (!raw) return
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      if (String(data.projectId || '') !== activeProjectId) return
      const l = Number(data.left ?? 0)
      const b = Number(data.back ?? 0)
      const r = Number(data.right ?? 0)
      const h = Number(data.height ?? 0)
      const t = Number(data.thickness ?? 0)
      if (l > 0 || b > 0 || r > 0 || h > 0 || t > 0 || (data.name && String(data.name).trim()) || (data.material && String(data.material))) {
        skipDirtyAfterRestoreRef.current = true
        if (data.name != null) setProjectName(String(data.name))
        if (data.material != null) setMaterial(String(data.material))
        if (data.principle === 'inside' || data.principle === 'outside') setPrinciple(data.principle)
        setLeft(l)
        setBack(b)
        setRight(r)
        setHeight(h)
        setThickness(t)
        setLeftText(l > 0 ? formatRu1(l) : '')
        setBackText(b > 0 ? formatRu1(b) : '')
        setRightText(r > 0 ? formatRu1(r) : '')
        setHeightText(h > 0 ? formatRu1(h) : '')
        setThicknessText(t > 0 ? formatRu1(t) : '')
        if (Array.isArray(data.openings)) setOpenings(data.openings as Opening[])
        if (data.note != null) setNote(String(data.note))
      }
    } catch {
      // ignore
    }
  }, [mode, currentProjectId, projectId, initialProject])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ type: string }>).detail
      if (d?.type !== 'walls_3') return
      try {
        const raw = sessionStorage.getItem('currentProjectData_walls_3')
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
        const raw = sessionStorage.getItem('currentProjectData_walls_3')
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
    if (dims.left === 0 || dims.back === 0 || dims.right === 0 || dims.height === 0) return null
    const t = dims.thickness
    // 3-walls volume rule:
    // inside: left + t/2, back + t, right + t/2
    // outside: left - t/2, back - t, right - t/2
    const sign = principle === 'inside' ? 1 : -1
    const l1 = Math.max(0, dims.left + sign * (t / 2))
    const l2 = Math.max(0, dims.back + sign * t)
    const l3 = Math.max(0, dims.right + sign * (t / 2))

    const openingsArea = openings.reduce((sum, o) => sum + clampNonNeg(o.width) * clampNonNeg(o.height), 0)
    const wallArea = Math.max(0, (l1 + l2 + l3) * dims.height - openingsArea)
    const volume = Math.max(0, wallArea * t)

    // Floor area:
    // - inside: back * max(left, right)
    // - outside: (back - t) * (max(left, right) - t/2)
    const maxSide = Math.max(dims.left, dims.right)
    const floorArea =
      principle === 'inside'
        ? Math.max(0, dims.back * maxSide)
        : Math.max(0, Math.max(0, dims.back - t) * Math.max(0, maxSide - t / 2))

    return { area: floorArea, volume }
  }, [dims, openings, principle])

  const materialLabel = MATERIALS.find((m) => m.value === material)?.label || 'Не выбран'
  const materialItems = MATERIALS.filter((m) => m.value !== '')

  // Требования для расчёта/создания PDF: достаточно размеров.
  // Название проекта и материал оставляем необязательными (подставим значения по умолчанию).
  const hasRequired =
    dims.left > 0 &&
    dims.back > 0 &&
    dims.right > 0 &&
    dims.height > 0 &&
    dims.thickness > 0

  const missingFields: string[] = []
  if (dims.left <= 0) missingFields.push('левую стену')
  if (dims.back <= 0) missingFields.push('заднюю стену')
  if (dims.right <= 0) missingFields.push('правую стену')
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
    
    // Проверяем веб-проекты (дубликат = то же имя и тот же тип: 3 стены)
    const webProjects = listLocalProjects().filter(p => p.platform !== 'android')
    const webDuplicate = webProjects.find(p => p.type === 'walls_3' && p.name.trim() === trimmedName && p.id !== excludeId)
    if (webDuplicate) return webDuplicate
    
    // Проверяем Android-проекты (если на Android)
    if (isAndroid) {
      try {
        const deviceProjects = await listDeviceProjects()
        const deviceDuplicate = deviceProjects.find(p => p.type === 'walls_3' && p.name.trim() === trimmedName && p.id !== excludeId)
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

    let foundation: { left: number; back: number; right: number; height: number; thickness: number; principle: 'inside' | 'outside'; concreteGrade?: string } | undefined
    const foundationRaw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('currentProjectData_foundation_3') : null
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

    let openingsToSave = openings
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('currentProjectData_walls_3')
        if (raw) {
          const parsed = JSON.parse(raw) as { openings?: Opening[] }
          if (Array.isArray(parsed.openings)) openingsToSave = parsed.openings
        }
      } catch {
        // ignore
      }
    }

    const p: LocalProject = {
      id,
      name: trimmedName,
      type: 'walls_3',
      createdAt: overwriteModalProject?.createdAt || initialProject?.createdAt || now,
      updatedAt: now,
      data: { principle, material, left: dims.left, back: dims.back, right: dims.right, height: dims.height, thickness: dims.thickness, openings: openingsToSave, note: note.trim() || undefined },
      platform,
      pdfComment: (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pdfComment_walls_3') : null)?.trim() || initialProject?.pdfComment || undefined,
      notes: (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('notes_walls_3') : null)?.trim() || initialProject?.notes || undefined,
      ...(foundation ? { foundation } : {}),
      ...(Object.keys({ ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('3') }).length > 0 ? { resultsOverrides: { ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('3') } } : {}),
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
        dims.left !== (init?.left ?? 0) ||
        dims.back !== (init?.back ?? 0) ||
        dims.right !== (init?.right ?? 0) ||
        dims.height !== (init?.height ?? 0) ||
        dims.thickness !== (init?.thickness ?? 0) ||
        JSON.stringify(openings) !== JSON.stringify(init?.openings ?? []) ||
        (note.trim() || '') !== (init?.note ?? '') ||
        JSON.stringify(resultsOverrides) !== JSON.stringify(initialProject?.resultsOverrides ?? {})
      
      if (hasChanges && isProjectSaved) {
        setIsProjectSaved(false)
      }
    }
  }, [projectName, material, principle, dims.left, dims.back, dims.right, dims.height, dims.thickness, openings, note, resultsOverrides, hasRequired, initialProject, init, isProjectSaved])

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
    
    // Используем клиентскую генерацию PDF для работы в статическом экспорте и на Android
    const { generatePdfWithPlanCapture } = await import('@/app/components/PdfPlanCapture')
    const foundationRaw = typeof window !== 'undefined' ? sessionStorage.getItem('currentProjectData_foundation_3') : null
    let foundation:
      | {
          left: number
          back: number
          right: number
          height: number
          thickness: number
          principle: 'inside' | 'outside'
          concreteGrade?: string
        }
      | undefined
    if (foundationRaw) {
      try {
        const f = JSON.parse(foundationRaw)
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
    let openingsForPdf = openings
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('currentProjectData_walls_3')
        if (raw) {
          const parsed = JSON.parse(raw) as { openings?: Opening[] }
          if (Array.isArray(parsed.openings)) openingsForPdf = parsed.openings
        }
      } catch {
        // ignore
      }
    }
    const comment = (typeof window !== 'undefined' ? sessionStorage.getItem('pdfComment_walls_3') : null)?.trim() || pdfComment.trim() || undefined
    const payload = {
      title: projectName.trim() || 'Проект строительства',
      includeMeta: includePdfMeta,
      materialLabel,
      principleLabel: principle === 'inside' ? 'Внутри' : 'Снаружи',
      dims: { left: dims.left, back: dims.back, right: dims.right, height: dims.height, thickness: dims.thickness },
      results,
      openings: openingsForPdf.map((o) => ({
        width: o.width,
        height: o.height,
        ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}),
        ...(o.wall != null ? { wall: o.wall } : {}),
      })),
      type: 'walls_3' as const,
      foundation,
      ...(Object.keys({ ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('3') }).length > 0 ? { resultsOverrides: { ...initialProject?.resultsOverrides, ...resultsOverrides, ...getFoundationRoofOverridesFromStorage('3') } } : {}),
      pdfComment: comment,
    }
    return await generatePdfWithPlanCapture('walls_3', payload)
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
          projectType: 'walls_3',
          materialLabel: materialItems.find(m => m.value === material)?.label || 'Не выбран',
          principleLabel: principle === 'inside' ? 'Внутри' : 'Снаружи',
        }))
      } else {
        throw new Error('Не удалось сохранить PDF')
      }
    } catch (error: unknown) {
      console.error('Ошибка при сохранении PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сохранения PDF. Проверьте разрешения приложения на доступ к файлам.'
      setToast(errorMessage)
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

  useAndroidBackHandler(handleOverwriteCancel, !!overwriteModalProject)

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
                fallbackHref={mode === 'edit' ? '/project' : '/projects/create/walls-3'}
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

        {/* mini visualization (same style as 2-walls) */}
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
            <svg
              viewBox="0 0 200 120"
              className="h-28 w-full max-w-md select-none rounded-[20px] border border-white/10 bg-[#10161f]"
            >
              <rect width="200" height="120" fill="transparent" />
              {(() => {
                const l = Number.isFinite(dims.left) && dims.left > 0 ? dims.left : 1
                const b = Number.isFinite(dims.back) && dims.back > 0 ? dims.back : 1
                const r = Number.isFinite(dims.right) && dims.right > 0 ? dims.right : 1

                const scale = 60 / Math.max(l, b, r, 1)
                const lPx = l * scale
                const bPx = b * scale
                const rPx = r * scale
                const thick = 4

                // U-shape placement
                const x0 = 40
                const yTop = 28
                const LABEL_OFFSET = 18

                const activeFill = '#3b82f6'
                const inactiveFill = 'rgba(255,255,255,0.20)'
                const activeStroke = '#2563eb'
                const inactiveStroke = 'rgba(255,255,255,0.25)'

                // walls: left vertical, back horizontal, right vertical
                const leftX = x0
                const backY = yTop
                const rightX = x0 + bPx - thick

                const leftY = backY + thick
                const rightY = backY + thick

                // labels (RU comma)
                const leftLabel = `${format2(dims.left)}`.replace('.', ',') + ' м'
                const backLabel = `${format2(dims.back)}`.replace('.', ',') + ' м'
                const rightLabel = `${format2(dims.right)}`.replace('.', ',') + ' м'

                return (
                  <>
                    {/* back */}
                    <rect
                      x={x0}
                      y={backY}
                      width={bPx}
                      height={thick}
                      rx={2}
                      fill={activeWall === 2 ? activeFill : inactiveFill}
                      stroke={activeWall === 2 ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(2)
                        backRef.current?.focus()
                      }}
                    />

                    {/* left */}
                    <rect
                      x={leftX}
                      y={leftY}
                      width={thick}
                      height={lPx}
                      rx={2}
                      fill={activeWall === 1 ? activeFill : inactiveFill}
                      stroke={activeWall === 1 ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(1)
                        leftRef.current?.focus()
                      }}
                    />

                    {/* right */}
                    <rect
                      x={rightX}
                      y={rightY}
                      width={thick}
                      height={rPx}
                      rx={2}
                      fill={activeWall === 3 ? activeFill : inactiveFill}
                      stroke={activeWall === 3 ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(3)
                        rightRef.current?.focus()
                      }}
                    />

                    {/* back label (centered on the back wall, consistent offset) */}
                    <text
                      x={x0 + bPx / 2}
                      // same offset as side labels, measured from the outer edge of the wall
                      y={Math.max(12, backY - LABEL_OFFSET)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activeWall === 2 ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(2)
                        backRef.current?.focus()
                      }}
                    >
                      {backLabel}
                    </text>

                    {/* left label (rotated) */}
                    <text
                      x={leftX - LABEL_OFFSET}
                      y={leftY + lPx / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activeWall === 1 ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${leftX - LABEL_OFFSET} ${leftY + lPx / 2})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(1)
                        leftRef.current?.focus()
                      }}
                    >
                      {leftLabel}
                    </text>

                    {/* right label (rotated) */}
                    <text
                      // measure from the outer edge of the right wall (rightX + thick)
                      x={rightX + thick + LABEL_OFFSET}
                      y={rightY + rPx / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activeWall === 3 ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${rightX + thick + LABEL_OFFSET} ${rightY + rPx / 2})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveWall(3)
                        rightRef.current?.focus()
                      }}
                    >
                      {rightLabel}
                    </text>
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
                placeholder="Левая стена (м)"
                value={leftText}
                ref={leftRef}
                onFocus={() => setActiveWall(1)}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setLeftText(t)
                  setLeft(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (leftText.trim() === '') return
                  setLeftText(formatRu1(left))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="android-field text-sm"
                placeholder="Задняя стена (м)"
                value={backText}
                ref={backRef}
                onFocus={() => setActiveWall(2)}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setBackText(t)
                  setBack(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (backText.trim() === '') return
                  setBackText(formatRu1(back))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="android-field text-sm"
                placeholder="Правая стена (м)"
                value={rightText}
                ref={rightRef}
                onFocus={() => setActiveWall(3)}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setRightText(t)
                  setRight(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (rightText.trim() === '') return
                  setRightText(formatRu1(right))
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
                  setHeightText(formatRu1(height))
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
                  setThicknessText(formatRu1(thickness))
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
                  onClick={() => setOpenings((arr) => arr.filter((_, i) => i !== idx))}
                  className="android-chip text-sm hover:bg-[#141a22]"
                >
                  ({formatRu1(o.width)}х{formatRu1(o.height)})
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
                    setOpenings((arr) => [...arr, { width: w, height: h }])
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
                          <button type="button" onClick={() => setResultsOverrides((p) => ({ ...p, wallsArea: undefined }))} className="text-xs text-blue-400 hover:text-blue-300">Сбросить к расчёту</button>
                        )}
                      </div>
                      {editingResult === 'wallsArea' ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input type="text" inputMode="decimal" value={editResultValue} onChange={(e) => setEditResultValue(sanitizeRuDecimalInput(e.target.value))} onBlur={() => commitEdit('wallsArea')} onKeyDown={(e) => { if (e.key === 'Enter') commitEdit('wallsArea') }} className="android-field w-32 px-3 py-2 text-2xl font-bold" autoFocus />
                          <span className="text-2xl font-semibold text-white">м²</span>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setEditingResult('wallsArea'); setEditResultValue(effectiveArea.toFixed(2).replace('.', ',')) }} className="mt-1 flex items-center gap-2 text-left">
                          <p className="text-4xl font-bold text-white">{effectiveArea.toFixed(2).replace('.', ',')} <span className="text-2xl font-semibold">м²</span></p>
                          <Pencil className="h-4 w-4 shrink-0 text-zinc-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                    <div className="android-panel-soft p-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-400">Объём</p>
                        {resultsOverrides.wallsVolume != null && (
                          <button type="button" onClick={() => setResultsOverrides((p) => ({ ...p, wallsVolume: undefined }))} className="text-xs text-blue-400 hover:text-blue-300">Сбросить к расчёту</button>
                        )}
                      </div>
                      {editingResult === 'wallsVolume' ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input type="text" inputMode="decimal" value={editResultValue} onChange={(e) => setEditResultValue(sanitizeRuDecimalInput(e.target.value))} onBlur={() => commitEdit('wallsVolume')} onKeyDown={(e) => { if (e.key === 'Enter') commitEdit('wallsVolume') }} className="android-field w-32 px-3 py-2 text-2xl font-bold" autoFocus />
                          <span className="text-2xl font-semibold text-white">м³</span>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setEditingResult('wallsVolume'); setEditResultValue(effectiveVolume.toFixed(2).replace('.', ',')) }} className="mt-1 flex items-center gap-2 text-left">
                          <p className="text-4xl font-bold text-white">{effectiveVolume.toFixed(2).replace('.', ',')} <span className="text-2xl font-semibold">м³</span></p>
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



