'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { deleteLocalProject, getLocalProject, listLocalProjects, upsertLocalProject, type LocalProject, type Opening } from '@/lib/projects/localProjects'
import { clearResultOverridesForVariant, clearResultOverridesFromStorage, getFoundationRoofOverridesFromStorage, getWallsOverridesFromStorage, setFoundationOverridesInStorage, setRoofOverridesInStorage, setWallsOverridesInStorage } from '@/lib/projects/resultOverridesStorage'
import { Capacitor } from '@capacitor/core'
import { deleteDeviceProject, listDeviceProjects, saveProjectToDevice } from '@/lib/projects/deviceProjects'
import WallsCalculator from '../create/walls-2/WallsCalculator'
import Walls3Calculator from '../create/walls-3/walls3Calculator'
import Walls4Calculator from '../create/walls-4/walls4Calculator'
import FoundationPage from '../create/walls-2/foundation/page'
import FoundationPage3 from '../create/walls-3/foundation/page'
import FoundationPage4 from '../create/walls-4/foundation/page'
import { RoofPageWithModal as RoofPage2 } from '../create/walls-2/roof/RoofPageWithModal'
import RoofPage3 from '../create/walls-3/roof/page'
import RoofPage4 from '../create/walls-4/roof/page'
import { DirtyProvider } from '../create/DirtyContext'
import { ConfirmModal } from '@/app/components/Modal'
import { DetailPlanFoundationWalls2 } from '@/app/components/DetailPlanFoundationWalls2'
import { DetailPlanWallsWalls2 } from '@/app/components/DetailPlanWallsWalls2'
import { DetailPlanRoofWalls2 } from '@/app/components/DetailPlanRoofWalls2'
import { DetailPlanFoundationWalls3 } from '@/app/components/DetailPlanFoundationWalls3'
import { DetailPlanFoundationWalls4 } from '@/app/components/DetailPlanFoundationWalls4'
import { DetailPlanWallsWalls3 } from '@/app/components/DetailPlanWallsWalls3'
import { DetailPlanWallsWalls4 } from '@/app/components/DetailPlanWallsWalls4'
import { DetailPlanRoofWalls3 } from '@/app/components/DetailPlanRoofWalls3'
import { DetailPlanRoofWalls4 } from '@/app/components/DetailPlanRoofWalls4'
import { BackButton, useAndroidBackHandler, useSmartBack } from '@/app/components/BackButton'
import { BackIcon, DownloadIcon, FoundationIcon, RoofIcon, WallsIcon } from '@/app/components/AppIcons'

function ProjectViewContent() {
  const router = useRouter()
  void router
  const sp = useSearchParams()
  const id = sp.get('id') ?? ''

  const [project, setProject] = useState<ReturnType<typeof getLocalProject> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!id) {
        console.log('[ProjectView] Нет ID проекта')
        return
      }
      
      console.log('[ProjectView] Начинаем загрузку проекта, ID:', id)
      setLoading(true)
      
      try {
        // Для Android сначала проверяем устройство (проекты могут быть только там)
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          console.log('[ProjectView] Android платформа, проверяем устройство...')
          try {
            // Добавляем таймаут для listDeviceProjects (как в LocalProjectsList)
            const deviceProjectsPromise = listDeviceProjects()
            const timeoutPromise = new Promise<LocalProject[]>((resolve) => 
              setTimeout(() => resolve([]), 5000) // Таймаут 5 секунд
            )
            
            const dev = await Promise.race([deviceProjectsPromise, timeoutPromise])
            console.log('[ProjectView] Загружено проектов с устройства:', dev.length)
            
            const found = dev.find((p) => p.id === id) ?? null
            if (found) {
              console.log('[ProjectView] Проект найден на устройстве:', found.name)
              if (!cancelled) {
                setProject(found)
              }
              return
            } else {
              console.log('[ProjectView] Проект не найден на устройстве, проверяем localStorage...')
            }
          } catch (error) {
            console.error('[ProjectView] Ошибка загрузки с устройства:', error)
          }
        }

        // Проверяем localStorage (для веб или как fallback для Android)
        console.log('[ProjectView] Проверяем localStorage...')
        const local = getLocalProject(id)
        if (local) {
          console.log('[ProjectView] Проект найден в localStorage:', local.name)
          if (!cancelled) {
            setProject(local)
          }
          return
        }

        // Проект не найден нигде
        console.warn('[ProjectView] Проект не найден ни на устройстве, ни в localStorage, ID:', id)
        if (!cancelled) {
          setProject(null)
        }
      } catch (error) {
        console.error('[ProjectView] Критическая ошибка при загрузке проекта:', error)
        if (!cancelled) {
          setProject(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Нет ID проекта</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0b0f14] font-sans text-white pt-safe">
        <header className="border-b border-white/8 bg-[#10161f]">
          <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
            <BackButton
              fallbackHref="/project"
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#1a2230] px-3 py-2.5 text-sm font-medium text-white"
            >
              <BackIcon className="h-5 w-5" aria-label="Назад" />
            </BackButton>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold">Проект не найден</h1>
          <p className="mt-2 text-zinc-400">Этот проект не найден в локальном хранилище на этом устройстве.</p>
        </main>
      </div>
    )
  }

  const handleRenameProject = async (newName: string) => {
    if (!project) return
    const trimmed = newName.trim() || project.name
    if (trimmed === project.name) return
    const updated = { ...project, name: trimmed, updatedAt: new Date().toISOString() }
    if (Capacitor.isNativePlatform()) {
      await saveProjectToDevice(updated)
    } else {
      upsertLocalProject(updated)
    }
    setProject(updated)
  }

  return (
    <DirtyProvider>
      <ProjectViewWithTabs project={project} onRenameProject={handleRenameProject} onProjectUpdated={setProject} />
    </DirtyProvider>
  )
}

type TabId = 'none' | 'foundation' | 'walls' | 'roof'

const PROJECT_TYPE_TITLES: Record<string, string> = {
  walls_2: 'Пристрой 2 стены',
  walls_3: 'Пристрой 3 стены',
  walls_4: 'Отдельная постройка 4 стены',
}

type WallSummary = { area: number; volume: number } | null

function ProjectViewWithTabs({ project, onRenameProject, onProjectUpdated }: { project: LocalProject; onRenameProject: (newName: string) => void; onProjectUpdated?: (p: LocalProject) => void }) {
  void onRenameProject
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('none')
  const [includePdfMeta, setIncludePdfMeta] = useState(false)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)
  const [foundationResult, setFoundationResult] = useState<{ volume: number; foundationLength: number } | null>(null)
  const [roofResult, setRoofResult] = useState<{ area: number } | null>(null)
  const [showConcreteGradeRequiredModal, setShowConcreteGradeRequiredModal] = useState(false)
  const [wallSummary, setWallSummary] = useState<WallSummary>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [pdfComment, setPdfComment] = useState('')
  const [notes, setNotes] = useState('')
  const [resultsOverrides, setResultsOverrides] = useState<{ wallsArea?: number; wallsVolume?: number; foundationVolume?: number; foundationReinforcement?: number; foundationHoops?: number; roofArea?: number }>(project?.resultsOverrides ?? {})
  const cardVariant = project ? (project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4') : undefined
  const cardOverrides = useMemo(() => {
    if (typeof window === 'undefined' || !cardVariant) return resultsOverrides
    const fromStorage = { ...getFoundationRoofOverridesFromStorage(cardVariant), ...getWallsOverridesFromStorage(cardVariant) }
    return { ...resultsOverrides, ...fromStorage }
  }, [resultsOverrides, cardVariant, activeTab])
  const lastSyncedProjectRef = useRef<{ id: string; updatedAt: string } | null>(null)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [detailView, setDetailView] = useState<'foundation' | 'walls' | 'roof' | null>(null)
  const detailViewScrollYRef = useRef(0)
  const closeDetailViewRef = useRef<(() => void) | null>(null)
  const pendingSaveOpenViewerRef = useRef(false)
  const [pdfCaptureProject, setPdfCaptureProject] = useState<LocalProject | null>(null)
  const pdfCaptureResolveRef = useRef<((b: Uint8Array) => void) | null>(null)
  const pdfCapturePayloadRef = useRef<Parameters<typeof import('@/lib/pdf/generatePdfClient').generatePdfClient>[0] | null>(null)
  const [pdfCaptureExtras, setPdfCaptureExtras] = useState<{ foundation: unknown; roof: unknown } | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const openDetailView = useCallback((view: 'foundation' | 'walls' | 'roof') => {
    detailViewScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0
    setDetailView(view)
  }, [])

  const closeDetailView = useCallback(() => {
    const tab = detailView
    const scrollY = detailViewScrollYRef.current
    setDetailView(null)
    if (tab) {
      requestAnimationFrame(() => {
        setActiveTab(tab)
        if (typeof window !== 'undefined') window.scrollTo(0, scrollY)
      })
    }
  }, [detailView])

  closeDetailViewRef.current = closeDetailView
  const goBackToProjects = useSmartBack('/project')

  const closeActiveTab = useCallback(() => {
    if (activeTab === 'foundation') {
      const hasSavedFoundation =
        project?.foundation &&
        typeof project.foundation === 'object' &&
        Object.keys(project.foundation).length > 0

      if (!hasSavedFoundation) {
        const foundationKey =
          project.type === 'walls_2' ? 'currentProjectData_foundation_2' :
          project.type === 'walls_3' ? 'currentProjectData_foundation_3' :
          'currentProjectData_foundation_4'
        const raw = sessionStorage.getItem(foundationKey)

        if (raw) {
          try {
            const data = JSON.parse(raw) as Record<string, unknown>
            const hasDims =
              project.type === 'walls_3'
                ? Number(data.left ?? 0) > 0 &&
                  Number(data.back ?? 0) > 0 &&
                  Number(data.right ?? 0) > 0 &&
                  Number(data.height ?? 0) > 0 &&
                  Number(data.thickness ?? 0) > 0
                : Number(data.length ?? 0) > 0 &&
                  Number(data.width ?? 0) > 0 &&
                  Number(data.height ?? 0) > 0 &&
                  Number(data.thickness ?? 0) > 0
            const concreteGrade = typeof data.concreteGrade === 'string' ? data.concreteGrade : ''

            if (hasDims && !concreteGrade) {
              setShowConcreteGradeRequiredModal(true)
              return
            }
          } catch {
            // ignore
          }
        }
      }
    }

    setActiveTab('none')
  }, [activeTab, project])

  useAndroidBackHandler(() => {
    if (detailView !== null) {
      closeDetailViewRef.current?.()
      return
    }

    if (showConcreteGradeRequiredModal) {
      setShowConcreteGradeRequiredModal(false)
      return
    }

    if (activeTab !== 'none') {
      closeActiveTab()
      return
    }

    goBackToProjects()
  })

  useEffect(() => {
    if (!project?.id) return
    setPdfComment(project.pdfComment ?? '')
    setNotes(project.notes ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- синхронизация при смене проекта по id
  }, [project?.id])

  // Карточки должны показывать те же данные, что и внутри страниц Фундамент/Стены/Крыша.
  // Всегда подмешиваем актуальные значения из storage, чтобы не затирать ручные вводы при возврате на обзор.
  useEffect(() => {
    if (!project?.id) return
    const variant = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
    const fromProject = project?.resultsOverrides ?? {}
    const fromStorage = { ...getFoundationRoofOverridesFromStorage(variant), ...getWallsOverridesFromStorage(variant) }
    setResultsOverrides({ ...fromProject, ...fromStorage })
  }, [project?.id, project?.type, project?.resultsOverrides])

  const lastClearedOverridesProjectIdRef = useRef<string | null>(null)
  const lastSyncedOverridesRef = useRef<{ id: string; updatedAt: string } | null>(null)
  // Синхронизируем переопределения из проекта в sessionStorage при открытии проекта и после сохранения.
  // Не перезаписываем storage при простом переключении вкладок (project не меняется), иначе «Сбросить к расчёту» затирается.
  useEffect(() => {
    if (typeof window === 'undefined' || !project?.id) return
    const updatedAt = project.updatedAt ?? ''
    if (lastSyncedOverridesRef.current?.id === project.id && lastSyncedOverridesRef.current?.updatedAt === updatedAt) return
    lastSyncedOverridesRef.current = { id: project.id, updatedAt }
    const variant = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
    const ro = project.resultsOverrides
    const hasOverrides =
      ro &&
      (ro.foundationVolume != null ||
        ro.foundationReinforcement != null ||
        ro.foundationHoops != null ||
        ro.roofArea != null ||
        ro.roofRaftersVolume != null ||
        ro.roofPurlinVolume != null ||
        ro.roofBattenVolume != null ||
        ro.wallsArea != null ||
        ro.wallsVolume != null)
    if (!hasOverrides) {
      if (lastClearedOverridesProjectIdRef.current !== project.id) {
        lastClearedOverridesProjectIdRef.current = project.id
        clearResultOverridesForVariant(variant)
      }
      return
    }
    lastClearedOverridesProjectIdRef.current = project.id
    setFoundationOverridesInStorage(variant, { foundationVolume: ro?.foundationVolume, foundationReinforcement: ro?.foundationReinforcement, foundationHoops: ro?.foundationHoops })
    setRoofOverridesInStorage(variant, { roofArea: ro?.roofArea })
    setWallsOverridesInStorage(variant, { wallsArea: ro?.wallsArea, wallsVolume: ro?.wallsVolume })
  }, [project?.id, project?.type, project?.resultsOverrides])

  // При возврате на обзор подтягиваем из sessionStorage актуальные переопределения фундамента, стен и крыши (их могли изменить на вкладках)
  useEffect(() => {
    if (activeTab !== 'none' || typeof window === 'undefined' || !project?.id) return
    const variant = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
    const foundationRoofOverrides = getFoundationRoofOverridesFromStorage(variant)
    const wallsOverrides = getWallsOverridesFromStorage(variant)
    setResultsOverrides((prev) => ({
      ...prev,
      ...foundationRoofOverrides,
      wallsArea: wallsOverrides.wallsArea,
      wallsVolume: wallsOverrides.wallsVolume,
    }))
  }, [activeTab, project?.id, project?.type])

  // При выходе со страницы проекта удаляем ручные переопределения из sessionStorage, если проект не сохранён.
  useEffect(() => {
    return () => {
      clearResultOverridesFromStorage()
    }
  }, [])

  // Сброс «грязного» состояния и синхронизация в storage при открытии проекта или после сохранения.
  // Сбрасываем dirty только при открытии другого проекта (!prev || prev.id !== id), чтобы изменение проёмов в модалке не гасило кнопку «Сохранить».
  useEffect(() => {
    if (!project?.id) return
    const id = project.id
    const updatedAt = project.updatedAt ?? ''
    const prev = lastSyncedProjectRef.current
    const isOpeningOtherProject = !prev || prev.id !== id
    if (isOpeningOtherProject) {
      sessionStorage.setItem('projectIsDirty', 'false')
      setIsDirty(false)
      if (!savedPdfUri) {
        setSavedPdfUri('saved')
      }
    }
    const shouldSync = !prev || prev.id !== id || prev.updatedAt !== updatedAt
    if (!shouldSync) return
    lastSyncedProjectRef.current = { id, updatedAt }
    const n = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
    const suffix = `_walls_${n}`
    sessionStorage.setItem(`currentProjectName${suffix}`, project.name || '')
    const wallsKey = `currentProjectData_walls_${n}`
    // Не перезаписываем стены/фундамент/крышу, если в сессии уже есть несохранённые правки этого же проекта (переключение вкладок Фундамент/Стены/Крыша)
    const existingWalls = (() => {
      try {
        const raw = sessionStorage.getItem(wallsKey)
        return raw ? (JSON.parse(raw) as { projectId?: string }) : null
      } catch {
        return null
      }
    })()
    const preserveSessionEdits = sessionStorage.getItem('projectIsDirty') === 'true' && existingWalls?.projectId === id
    if (!preserveSessionEdits) {
      const wallsData = {
        projectId: project.id,
        name: project.name,
        material: project.data.material,
        principle: project.data.principle,
        ...('width' in project.data
          ? { width: project.data.width, length: project.data.length }
          : { left: project.data.left, back: project.data.back, right: project.data.right }),
        height: project.data.height,
        thickness: project.data.thickness,
        openings: project.data.openings || [],
        note: project.data.note,
      }
      sessionStorage.setItem(wallsKey, JSON.stringify(wallsData))
      const foundationKey = `currentProjectData_foundation_${n}`
      if (project.foundation && typeof project.foundation === 'object' && Object.keys(project.foundation).length > 0) {
        sessionStorage.setItem(foundationKey, JSON.stringify(project.foundation))
      } else {
        sessionStorage.removeItem(foundationKey)
      }
      const projectWithRoof = project as { roof?: Record<string, unknown> }
      const roofKey = `currentProjectData_roof_${n}`
      if (projectWithRoof.roof && typeof projectWithRoof.roof === 'object' && Object.keys(projectWithRoof.roof).length > 0) {
        sessionStorage.setItem(roofKey, JSON.stringify(projectWithRoof.roof))
      } else {
        sessionStorage.removeItem(roofKey)
      }
    }
    sessionStorage.setItem(`pdfComment${suffix}`, project.pdfComment ?? '')
    sessionStorage.setItem(`notes${suffix}`, project.notes ?? '')
    window.dispatchEvent(new CustomEvent('projectDataChanged'))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- явный набор полей проекта, project/savedPdfUri не добавляем намеренно
  }, [project?.id, project?.name, project?.type, project?.data, project?.foundation, (project as { roof?: unknown })?.roof, project?.pdfComment, project?.notes])

  // При выходе из проекта без сохранения сбрасываем несохранённые данные в storage, чтобы при следующем открытии показать сохранённое состояние
  useEffect(() => {
    const id = project?.id
    const type = project?.type
    return () => {
      if (typeof window === 'undefined' || !id || !type) return
      if (sessionStorage.getItem('projectIsDirty') !== 'true') return
      const n = type === 'walls_2' ? '2' : type === 'walls_3' ? '3' : '4'
      sessionStorage.removeItem(`currentProjectData_walls_${n}`)
      sessionStorage.removeItem(`currentProjectData_foundation_${n}`)
      sessionStorage.removeItem(`currentProjectData_roof_${n}`)
      sessionStorage.setItem('projectIsDirty', 'false')
    }
  }, [project?.id, project?.type])

  const formatDateForPdf = (isoDate?: string) => {
    if (!isoDate) return null
    const date = new Date(isoDate)
    if (Number.isNaN(date.getTime())) return null
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  type Walls2Data = { width: number; length: number; height: number; thickness: number; principle?: string; openings?: Array<{ width: number; height: number }> }
  type Walls3Data = { left: number; back: number; right: number; height: number; thickness: number; principle?: string; openings?: Array<{ width: number; height: number }> }
  type Walls4Data = { width: number; length: number; height: number; thickness: number; principle?: string; openings?: Array<{ width: number; height: number }> }
  const computeWallSummary = (type: LocalProject['type'], data: Walls2Data | Walls3Data | Walls4Data): WallSummary => {
    if (type === 'walls_2') {
      const d = data as Walls2Data
      if (d.width <= 0 || d.length <= 0 || d.height <= 0 || d.thickness <= 0) return null
      const t = d.thickness
      const adj = d.principle === 'inside' ? t / 2 : -t / 2
      const l1 = Math.max(0, d.width + adj)
      const l2 = Math.max(0, d.length + adj)
      const openingsArea = (d.openings || []).reduce((sum: number, o: { width: number; height: number }) => sum + (o.width ?? 0) * (o.height ?? 0), 0)
      const wallArea = Math.max(0, (l1 + l2) * d.height - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const innerAdj = d.principle === 'inside' ? 0 : -t / 2
      const area = Math.max(0, (d.width + innerAdj) * (d.length + innerAdj))
      return { area, volume }
    }
    if (type === 'walls_3') {
      const d = data as Walls3Data
      if (d.left <= 0 || d.back <= 0 || d.right <= 0 || d.height <= 0 || d.thickness <= 0) return null
      const t = d.thickness
      const sign = d.principle === 'inside' ? 1 : -1
      const l1 = Math.max(0, d.left + sign * (t / 2))
      const l2 = Math.max(0, d.back + sign * t)
      const l3 = Math.max(0, d.right + sign * (t / 2))
      const openingsArea = (d.openings || []).reduce((sum: number, o: { width: number; height: number }) => sum + (o.width ?? 0) * (o.height ?? 0), 0)
      const wallArea = Math.max(0, (l1 + l2 + l3) * d.height - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const maxSide = Math.max(d.left, d.right)
      const area =
        d.principle === 'inside'
          ? Math.max(0, d.back * maxSide)
          : Math.max(0, Math.max(0, d.back - t) * Math.max(0, maxSide - t / 2))
      return { area, volume }
    }
    if (type === 'walls_4') {
      const d = data as Walls4Data
      if (d.width <= 0 || d.length <= 0 || d.height <= 0 || d.thickness <= 0) return null
      const t = d.thickness
      const sign = d.principle === 'inside' ? 1 : -1
      const wSide = Math.max(0, d.width + sign * t)
      const lSide = Math.max(0, d.length + sign * t)
      const perimeter = 2 * (wSide + lSide)
      const openingsArea = (d.openings || []).reduce((sum: number, o: { width: number; height: number }) => sum + (o.width ?? 0) * (o.height ?? 0), 0)
      const wallArea = Math.max(0, perimeter * d.height - openingsArea)
      const volume = Math.max(0, wallArea * t)
      const area =
        d.principle === 'inside'
          ? Math.max(0, d.width * d.length)
          : Math.max(0, Math.max(0, d.width - 2 * t) * Math.max(0, d.length - 2 * t))
      return { area, volume }
    }
    return null
  }

  useEffect(() => {
    const includePdfMetaKey = project.type === 'walls_2' ? 'includePdfMeta_walls_2' : project.type === 'walls_3' ? 'includePdfMeta_walls_3' : 'includePdfMeta_walls_4'
    const savedIncludePdfMeta = sessionStorage.getItem(includePdfMetaKey)
    setIncludePdfMeta(savedIncludePdfMeta === 'true')
    const savedPdfUriFromStorage = sessionStorage.getItem('pdfViewerUri')
    const savedPdfBytes = sessionStorage.getItem('pdfViewerPdfBytes')
    if (savedPdfUriFromStorage) {
      setSavedPdfUri(savedPdfUriFromStorage)
    } else if (savedPdfBytes) {
      // Файл сохранён, но uri мог быть очищен — помечаем как сохранённый
      setSavedPdfUri('saved')
    }
    // При открытии сохранённого проекта кнопка дискеты неактивна; станет активной только после изменений в фундаменте/стенах/крыше
    setIsDirty(false)
    if (typeof window !== 'undefined') sessionStorage.setItem('projectIsDirty', 'false')

    const computeFoundationResult = () => {
      const foundationKey =
        project.type === 'walls_2' ? 'currentProjectData_foundation_2' :
        project.type === 'walls_3' ? 'currentProjectData_foundation_3' :
        'currentProjectData_foundation_4'
      const raw = sessionStorage.getItem(foundationKey)
      const dataFromStorage = raw ? (() => { try { return JSON.parse(raw) as Record<string, unknown> } catch { return null } })() : null
      const data = dataFromStorage ?? (project as { foundation?: Record<string, unknown> }).foundation
      if (!data || typeof data !== 'object') {
        setFoundationResult(null)
        return
      }
      try {
        const h = Number(data.height ?? 0)
        const t = Number(data.thickness ?? 0)
        const principle = data.principle === 'inside' ? 'inside' : 'outside'
        const adj = principle === 'inside' ? t / 2 : -t / 2
        if (project.type === 'walls_3') {
          const left = Number(data.left ?? 0)
          const back = Number(data.back ?? 0)
          const right = Number(data.right ?? 0)
          if (left > 0 && back > 0 && right > 0 && h > 0 && t > 0) {
            const adjustedLeft = Math.max(0, left + adj)
            const adjustedBack = Math.max(0, back + adj)
            const adjustedRight = Math.max(0, right + adj)
            const foundationLength = adjustedLeft + adjustedBack + adjustedRight
            const volume = foundationLength * t * h
            setFoundationResult({ volume, foundationLength })
            return
          }
        } else {
          const len = Number(data.length ?? 0)
          const w = Number(data.width ?? 0)
          if (len > 0 && w > 0 && h > 0 && t > 0) {
            const adjustedWidth = Math.max(0, w + adj)
            const adjustedLength = Math.max(0, len + adj)
            const foundationLength = adjustedWidth + adjustedLength
            const volume = foundationLength * t * h
            setFoundationResult({ volume, foundationLength })
            return
          }
        }
      } catch {
        // ignore
      }
      setFoundationResult(null)
    }

    const computeRoofResultFromStorage = (): { area: number } | null => {
      const n = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
      const raw = sessionStorage.getItem(`currentProjectData_roof_${n}`)
      if (!raw) return null
      try {
        const data = JSON.parse(raw) as Record<string, number>
        const height = Number(data.height ?? 0)
        const overhang = Number(data.overhang ?? 0)
        if (project.type === 'walls_2') {
          const width = Number(data.width ?? 0)
          const length = Number(data.length ?? 0)
          const slopeToward = Number(data.slopeToward ?? 0) === 1 ? 1 : 0
          if (width <= 0 || length <= 0) return null
          const slopeRun = slopeToward === 0 ? width : length
          const ridgeRun = slopeToward === 0 ? length : width
          const slopeLength = Math.sqrt(slopeRun * slopeRun + height * height)
          const area = (slopeLength + overhang) * (ridgeRun + overhang)
          return { area: Math.round(area * 100) / 100 }
        }
        if (project.type === 'walls_3') {
          const left = Number(data.left ?? 0)
          const back = Number(data.back ?? 0)
          const right = Number(data.right ?? 0)
          if (left <= 0 || back <= 0 || right <= 0) return null
          const depth = Math.max(left, right)
          const slopeLength = Math.sqrt(depth * depth + height * height)
          const area = (slopeLength + overhang) * (back + 2 * overhang)
          return { area: Math.round(area * 100) / 100 }
        }
        if (project.type === 'walls_4') {
          const width = Number(data.width ?? 0)
          const length = Number(data.length ?? 0)
          if (width <= 0 || length <= 0) return null
          const isGable = (data as Record<string, unknown>).type === 'gable'
          if (isGable) {
            const ridgeAlongLength = (data as Record<string, unknown>).ridgeAlongLength !== false
            const run = ridgeAlongLength ? width / 2 : length / 2
            const slopeLength = Math.sqrt(run * run + height * height)
            const slopeDim = slopeLength + overhang
            const alongDim = ridgeAlongLength ? length + 2 * overhang : width + 2 * overhang
            const area = 2 * slopeDim * alongDim
            return { area: Math.round(area * 100) / 100 }
          }
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

    const computeWallSummaryFromStorage = () => {
      const key =
        project.type === 'walls_2'
          ? 'currentProjectData_walls_2'
          : project.type === 'walls_3'
            ? 'currentProjectData_walls_3'
            : 'currentProjectData_walls_4'
      const raw = sessionStorage.getItem(key)
      if (raw) {
        try {
          const d = JSON.parse(raw) as Record<string, unknown>
          if (project.type === 'walls_2') {
            const data = {
              width: Number(d.width ?? 0),
              length: Number(d.length ?? 0),
              height: Number(d.height ?? 0),
              thickness: Number(d.thickness ?? 0),
              principle: d.principle === 'inside' ? 'inside' : 'outside',
              openings: Array.isArray(d.openings) ? d.openings : [],
            }
            setWallSummary(computeWallSummary('walls_2', data))
            return
          }
          if (project.type === 'walls_3') {
            const data = {
              left: Number(d.left ?? 0),
              back: Number(d.back ?? 0),
              right: Number(d.right ?? 0),
              height: Number(d.height ?? 0),
              thickness: Number(d.thickness ?? 0),
              principle: d.principle === 'inside' ? 'inside' : 'outside',
              openings: Array.isArray(d.openings) ? d.openings : [],
            }
            setWallSummary(computeWallSummary('walls_3', data))
            return
          }
          const data = {
            width: Number(d.width ?? 0),
            length: Number(d.length ?? 0),
            height: Number(d.height ?? 0),
            thickness: Number(d.thickness ?? 0),
            principle: d.principle === 'inside' ? 'inside' : 'outside',
            openings: Array.isArray(d.openings) ? d.openings : [],
          }
          setWallSummary(computeWallSummary('walls_4', data))
          return
        } catch {
          // ignore
        }
      }
      setWallSummary(computeWallSummary(project.type, project.data))
    }

    computeFoundationResult()
    const roofFromStorage = computeRoofResultFromStorage()
    if (roofFromStorage) {
      setRoofResult(roofFromStorage)
    } else {
      const projRoof = (project as { roof?: Record<string, number> }).roof
      if (projRoof && typeof projRoof === 'object') {
        const area = Number(projRoof.area)
        if (Number.isFinite(area) && area > 0) {
          setRoofResult({ area })
        } else {
          const height = Number(projRoof.height ?? 0)
          const overhang = Number(projRoof.overhang ?? 0)
          if ('width' in projRoof && 'length' in projRoof) {
            const w = Number(projRoof.width ?? 0)
            const len = Number(projRoof.length ?? 0)
            if (w > 0 && len > 0) {
              const isGable = (projRoof as { type?: string }).type === 'gable'
              if (isGable) {
                const ridgeAlongLength = (projRoof as { ridgeAlongLength?: boolean }).ridgeAlongLength !== false
                const run = ridgeAlongLength ? w / 2 : len / 2
                const slopeLength = Math.sqrt(run * run + height * height)
                const alongDim = ridgeAlongLength ? len + 2 * overhang : w + 2 * overhang
                const area = 2 * (slopeLength + overhang) * alongDim
                setRoofResult({ area: Math.round(area * 100) / 100 })
              } else {
                const slopeLength = Math.sqrt(w * w + height * height)
                const slopeDim = slopeLength + 2 * overhang
                const lengthDim = len + 2 * overhang
                setRoofResult({ area: Math.round(slopeDim * lengthDim * 100) / 100 })
              }
            } else setRoofResult(null)
          } else if ('left' in projRoof && 'back' in projRoof && 'right' in projRoof) {
            const left = Number(projRoof.left ?? 0)
            const back = Number(projRoof.back ?? 0)
            const right = Number(projRoof.right ?? 0)
            if (left > 0 && back > 0 && right > 0) {
              const depth = Math.max(left, right)
              const slopeLength = Math.sqrt(depth * depth + height * height)
              setRoofResult({ area: Math.round((slopeLength + overhang) * (back + 2 * overhang) * 100) / 100 })
            } else setRoofResult(null)
          } else setRoofResult(null)
        }
      } else setRoofResult(null)
    }
    computeWallSummaryFromStorage()
    const handleProjectDataChanged = () => {
      const dirty = sessionStorage.getItem('projectIsDirty') === 'true'
      setIsDirty(dirty)
      if (dirty) {
        setSavedPdfUri(null)
        sessionStorage.removeItem('pdfViewerUri')
      }
      computeFoundationResult()
      setRoofResult(computeRoofResultFromStorage())
      computeWallSummaryFromStorage()
    }
    const handleProjectIsDirtyChanged = () => {
      const dirty = sessionStorage.getItem('projectIsDirty') === 'true'
      setIsDirty(dirty)
      if (dirty) {
        setSavedPdfUri(null)
        sessionStorage.removeItem('pdfViewerUri')
      }
    }
    window.addEventListener('projectDataChanged', handleProjectDataChanged)
    window.addEventListener('projectIsDirtyChanged', handleProjectIsDirtyChanged)
    return () => {
      window.removeEventListener('projectDataChanged', handleProjectDataChanged)
      window.removeEventListener('projectIsDirtyChanged', handleProjectIsDirtyChanged)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- пересчёт при смене типа, computeWallSummary/project не в deps намеренно
  }, [project?.type])

  const CAPTURE_DELAY_MS = 700
  // Захват большой визуализации для PDF (walls_2, walls_3, walls_4): после рендера планов делаем toPng и передаём в generatePdfClient
  useEffect(() => {
    if (!pdfCaptureProject) return
    const payload = pdfCapturePayloadRef.current
    if (!payload) return
    const timer = setTimeout(async () => {
      try {
        const foundationEl = document.querySelector('[data-pdf-plan="foundation"]')
        const wallsEl = document.querySelector('[data-pdf-plan="walls"]')
        const roofEl = document.querySelector('[data-pdf-plan="roof"]')
        const { toPng } = await import('html-to-image')
        const planImages: import('@/lib/pdf/generatePdfClient').PlanImages = {}
        if (foundationEl) planImages.foundation = await toPng(foundationEl as HTMLElement, { pixelRatio: 2 })
        if (wallsEl) planImages.walls = await toPng(wallsEl as HTMLElement, { pixelRatio: 2 })
        if (roofEl) planImages.roof = await toPng(roofEl as HTMLElement, { pixelRatio: 2 })
        const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
        const pdfBytes = await generatePdfClient({ ...payload, planImages })
        pdfCaptureResolveRef.current?.(pdfBytes)
      } catch (e) {
        console.warn('PDF plan capture failed, falling back to simple plan', e)
        try {
          const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
          const pdfBytes = await generatePdfClient(payload)
          pdfCaptureResolveRef.current?.(pdfBytes)
        } catch {
          pdfCaptureResolveRef.current?.(new Uint8Array(0))
        }
      } finally {
        setPdfCaptureProject(null)
        setPdfCaptureExtras(null)
        pdfCaptureResolveRef.current = null
        pdfCapturePayloadRef.current = null
      }
    }, CAPTURE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pdfCaptureProject])

  const isPdfSaved = !!savedPdfUri
  const isDirtyEffective = isDirty
  // Есть ли данные по разделам (достаточно для PDF) — при открытии из «Мои проекты» кнопка должна быть доступна
  const hasAnySectionData = !!(
    (project.foundation && typeof project.foundation === 'object' && Object.keys(project.foundation).length > 0) ||
    (project.data && (
      ('width' in project.data && Number(project.data.width) > 0 && Number(project.data.length) > 0) ||
      ('left' in project.data && Number(project.data.left) > 0 && Number(project.data.back) > 0 && Number(project.data.right) > 0)
    )) ||
    ((project as { roof?: unknown }).roof && typeof (project as { roof?: unknown }).roof === 'object')
  )
  const isPdfButtonActive = (project.name.trim() !== '') || isPdfSaved || isDirtyEffective || hasAnySectionData

  const materialLabels: Record<string, string> = {
    brick_m100: 'Кирпич (M100)',
    brick_m150: 'Кирпич (M150)',
    concrete_m200: 'Бетон (M200)',
    concrete_m300: 'Бетон (M300)',
    polystyrene_concrete_d400: 'Полистиролбетон (D400)',
    polystyrene_concrete_d500: 'Полистиролбетон (D500)',
    wood_pine: 'Дерево (Сосна)',
    wood_larch: 'Дерево (Лиственница)',
  }

  const openSavedPdf = async () => {
    if (!savedPdfUri) return
    // Всегда открываем из папки: по pdfFilename или по id.pdf
    const filename = (project as { pdfFilename?: string }).pdfFilename || `${project.id}.pdf`
    sessionStorage.setItem('pdfViewerFilename', filename)

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const { getSavedPdfUri } = await import('@/lib/pdf/pdfStorage')
      const saved = getSavedPdfUri(filename)
      if (saved) {
        sessionStorage.setItem('pdfViewerUri', saved.uri)
        sessionStorage.setItem('pdfViewerFilePath', saved.path)
        sessionStorage.removeItem('pdfViewerReturnTo')
        const params = new URLSearchParams()
        params.set('uri', saved.uri)
        params.set('filename', filename)
        params.set('projectName', project.name || 'Проект')
        const projectDate = formatDateForPdf(project.updatedAt || project.createdAt)
        if (projectDate) params.set('projectDate', projectDate)
        router.push(`/pdf-viewer?${params.toString()}`)
        return
      }
    }

    const params = new URLSearchParams()
    if (savedPdfUri !== 'saved') params.set('uri', savedPdfUri)
    params.set('filename', filename)
    params.set('projectName', project.name || 'Проект')
    const projectDate = formatDateForPdf(project.updatedAt || project.createdAt)
    if (projectDate) params.set('projectDate', projectDate)
    sessionStorage.removeItem('pdfViewerReturnTo')
    router.push(`/pdf-viewer?${params.toString()}`)
  }

  const handleSavePdf = async (openViewer = false, skipOverwriteConfirm = false): Promise<boolean> => {
    // Если нужно открыть, игнорируем наличие сохраненного URI и перегенерируем, чтобы гарантировать наличие файла
    if (savedPdfUri && !isDirtyEffective && !openViewer) return true
    setSaveMessage(null)
    try {
      const storageKey =
        project.type === 'walls_2' ? 'currentProjectData_walls_2' :
        project.type === 'walls_3' ? 'currentProjectData_walls_3' :
        'currentProjectData_walls_4'
      const storageRaw = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null
      let currentName = project.name
      let currentData = project.data
      if (storageRaw) {
        try {
          const parsed = JSON.parse(storageRaw) as { name?: string; material?: string; principle?: string; width?: number; length?: number; height?: number; thickness?: number; left?: number; back?: number; right?: number; openings?: unknown[]; note?: string }
          if (parsed && typeof parsed.name === 'string') currentName = parsed.name
          if (parsed && (parsed.material !== undefined || parsed.principle !== undefined)) {
            // Размеры из sessionStorage подставляем только если > 0, иначе берём из проекта (чтобы нули не затирали сохранённые значения)
            if (project.type === 'walls_2') {
              const d = project.data as { width: number; length: number; height: number; thickness: number }
              currentData = {
                principle: (parsed.principle === 'outside' ? 'outside' : 'inside') as 'inside' | 'outside',
                material: typeof parsed.material === 'string' ? parsed.material : project.data.material,
                width: Number(parsed.width) > 0 ? Number(parsed.width) : (d.width ?? 0),
                length: Number(parsed.length) > 0 ? Number(parsed.length) : (d.length ?? 0),
                height: Number(parsed.height) > 0 ? Number(parsed.height) : (d.height ?? 0),
                thickness: Number(parsed.thickness) > 0 ? Number(parsed.thickness) : (d.thickness ?? 0),
                openings: Array.isArray(parsed.openings) ? parsed.openings as { width: number; height: number }[] : project.data.openings,
                note: typeof parsed.note === 'string' ? parsed.note : project.data.note,
              }
            } else if (project.type === 'walls_3') {
              const d = project.data as { left: number; back: number; right: number; height: number; thickness: number; openings?: Opening[] }
              const useStorageOpenings = Array.isArray(parsed.openings) && parsed.openings.length > 0
              currentData = {
                principle: (parsed.principle === 'outside' ? 'outside' : 'inside') as 'inside' | 'outside',
                material: typeof parsed.material === 'string' ? parsed.material : project.data.material,
                left: Number(parsed.left) > 0 ? Number(parsed.left) : (d.left ?? 0),
                back: Number(parsed.back) > 0 ? Number(parsed.back) : (d.back ?? 0),
                right: Number(parsed.right) > 0 ? Number(parsed.right) : (d.right ?? 0),
                height: Number(parsed.height) > 0 ? Number(parsed.height) : (d.height ?? 0),
                thickness: Number(parsed.thickness) > 0 ? Number(parsed.thickness) : (d.thickness ?? 0),
                openings: useStorageOpenings ? (parsed.openings as Opening[]) : (d.openings ?? []),
                note: typeof parsed.note === 'string' ? parsed.note : project.data.note,
              }
            } else {
              const d = project.data as { width: number; length: number; height: number; thickness: number }
              currentData = {
                principle: (parsed.principle === 'outside' ? 'outside' : 'inside') as 'inside' | 'outside',
                material: typeof parsed.material === 'string' ? parsed.material : project.data.material,
                width: Number(parsed.width) > 0 ? Number(parsed.width) : (d.width ?? 0),
                length: Number(parsed.length) > 0 ? Number(parsed.length) : (d.length ?? 0),
                height: Number(parsed.height) > 0 ? Number(parsed.height) : (d.height ?? 0),
                thickness: Number(parsed.thickness) > 0 ? Number(parsed.thickness) : (d.thickness ?? 0),
                openings: Array.isArray(parsed.openings) ? parsed.openings as { width: number; height: number }[] : project.data.openings,
                note: typeof parsed.note === 'string' ? parsed.note : project.data.note,
              }
            }
          }
        } catch {
          // ignore
        }
      }
      const nameChanged = currentName.trim() !== (project.name || '').trim()
      const trimmedNewName = currentName.trim() || project.name
      let projectToSave: LocalProject = project
      let filenameToUse = `${project.id}.pdf`
      let overwroteExistingWithSameName = false
      if (nameChanged) {
        const webProjects = listLocalProjects().filter((p) => p.platform !== 'android')
        let duplicateByType = webProjects.find(
          (p) => p.type === project.type && p.name.trim() === trimmedNewName && p.id !== project.id
        ) as LocalProject | undefined
        if (Capacitor.isNativePlatform() && !duplicateByType) {
          const deviceProjects = await listDeviceProjects()
          duplicateByType = deviceProjects.find(
            (p) => p.type === project.type && p.name.trim() === trimmedNewName && p.id !== project.id
          ) as LocalProject | undefined
        }
        if (duplicateByType) {
          if (
            !window.confirm(
              `Проект с названием «${trimmedNewName}» уже существует (тот же тип проекта). Перезаписать существующий проект?`
            )
          ) {
            setSaveMessage('Сохранение отменено.')
            setTimeout(() => setSaveMessage(null), 3000)
            return false
          }
          overwroteExistingWithSameName = true
          filenameToUse = `${duplicateByType.id}.pdf`
          projectToSave = {
            ...project,
            id: duplicateByType.id,
            name: trimmedNewName,
            createdAt: duplicateByType.createdAt,
            updatedAt: new Date().toISOString(),
            data: currentData,
            pdfFilename: filenameToUse,
          } as LocalProject
        } else {
          const newId = crypto.randomUUID()
          filenameToUse = `${newId}.pdf`
          projectToSave = {
            ...project,
            id: newId,
            name: trimmedNewName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: currentData,
            pdfFilename: filenameToUse,
          } as LocalProject
        }
      } else {
        projectToSave = { ...projectToSave, data: currentData } as LocalProject
      }
      projectToSave = { ...projectToSave, pdfComment: pdfComment.trim() || undefined, notes: notes.trim() || undefined }
      const variant = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
      // Берём переопределения только из storage (источник правды после вкладок Фундамент/Стены/Крыша). Иначе после «Сбросить к расчёту» в проект снова попадали бы старые из resultsOverrides.
      const mergedOverrides = { ...getFoundationRoofOverridesFromStorage(variant), ...getWallsOverridesFromStorage(variant) }
      projectToSave = { ...projectToSave, resultsOverrides: mergedOverrides } as LocalProject

      if (!nameChanged && !skipOverwriteConfirm) {
        pendingSaveOpenViewerRef.current = openViewer
        setShowOverwriteConfirm(true)
        return false
      }

      const materialLabel = materialLabels[projectToSave.data.material] || 'Не выбран'
      const principleLabel = projectToSave.data.principle === 'inside' ? 'Внутри' : 'Снаружи'
      const results = nameChanged ? computeWallSummary(project.type, projectToSave.data) : wallSummary

      const foundationKey =
        project.type === 'walls_2' ? 'currentProjectData_foundation_2' :
        project.type === 'walls_3' ? 'currentProjectData_foundation_3' :
        'currentProjectData_foundation_4'
      const foundationRaw = sessionStorage.getItem(foundationKey)
      let foundation:
        | {
            length: number
            width: number
            height: number
            thickness: number
            principle: 'inside' | 'outside'
            concreteGrade?: string
          }
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
          if (project.type === 'walls_3') {
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
          } else {
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
          }
        } catch {
          // ignore
        }
      }

      projectToSave = { ...projectToSave, foundation }

      // Всегда подставляем крышу из sessionStorage при сохранении, чтобы сохранялись правки с вкладки «Крыша»
      let projectRoof = (projectToSave as { roof?: unknown }).roof
      const roofKey = project.type === 'walls_2' ? 'currentProjectData_roof_2' : project.type === 'walls_3' ? 'currentProjectData_roof_3' : 'currentProjectData_roof_4'
      const roofRaw = typeof window !== 'undefined' ? sessionStorage.getItem(roofKey) : null
      if (roofRaw) {
        try {
            const r = JSON.parse(roofRaw) as Record<string, number>
            const areaOverride = mergedOverrides.roofArea
            if (project.type === 'walls_2') {
              const w = Number(r.width ?? 0)
              const len = Number(r.length ?? 0)
              const h = Number(r.height ?? 0)
              const o = Number(r.overhang ?? 0)
              const slopeToward = Number(r.slopeToward ?? 0) === 1 ? 1 : 0
              if (w > 0 && len > 0) {
                const slopeRun = slopeToward === 0 ? w : len
                const ridgeRun = slopeToward === 0 ? len : w
                const slopeLen = Math.sqrt(slopeRun * slopeRun + h * h)
                const area: number = typeof areaOverride === 'number' && Number.isFinite(areaOverride) && areaOverride >= 0 ? areaOverride : (slopeLen + o) * (ridgeRun + o)
                projectRoof = { width: w, length: len, height: h, overhang: o, slopeToward, area: Math.round(area * 100) / 100 }
                projectToSave = { ...projectToSave, roof: projectRoof } as LocalProject
              }
            } else if (project.type === 'walls_3') {
              const left = Number(r.left ?? 0)
              const back = Number(r.back ?? 0)
              const right = Number(r.right ?? 0)
              const h = Number(r.height ?? 0)
              const o = Number(r.overhang ?? 0)
              if (left > 0 && back > 0 && right > 0) {
                const depth = Math.max(left, right)
                const slopeLen = Math.sqrt(depth * depth + h * h)
                const area: number = typeof areaOverride === 'number' && Number.isFinite(areaOverride) && areaOverride >= 0 ? areaOverride : (slopeLen + o) * (back + 2 * o)
                projectRoof = { left, back, right, height: h, overhang: o, area: Math.round(area * 100) / 100 }
                projectToSave = { ...projectToSave, roof: projectRoof } as LocalProject
              }
            } else {
              const w = Number(r.width ?? 0)
              const len = Number(r.length ?? 0)
              const h = Number(r.height ?? 0)
              const o = Number(r.overhang ?? 0)
              const isGable = (r as Record<string, unknown>).type === 'gable'
              const ridgeAlongLength = (r as Record<string, unknown>).ridgeAlongLength !== false
              if (w > 0 && len > 0) {
                let area: number
                if (typeof areaOverride === 'number' && Number.isFinite(areaOverride) && areaOverride >= 0) {
                  area = areaOverride
                } else if (isGable) {
                  const run = ridgeAlongLength ? w / 2 : len / 2
                  const slopeLen = Math.sqrt(run * run + h * h)
                  const slopeDim = slopeLen + o
                  const alongDim = ridgeAlongLength ? len + 2 * o : w + 2 * o
                  area = 2 * slopeDim * alongDim
                } else {
                  const slopeLen = Math.sqrt(w * w + h * h)
                  const slopeDim = slopeLen + 2 * o
                  const lengthDim = len + 2 * o
                  area = slopeDim * lengthDim
                }
                projectRoof = {
                  ...(isGable ? { type: 'gable' as const, ridgeAlongLength } : { type: 'single' as const }),
                  width: w,
                  length: len,
                  height: h,
                  overhang: o,
                  area: Math.round(area * 100) / 100,
                }
                projectToSave = { ...projectToSave, roof: projectRoof } as LocalProject
              }
            }
        } catch {
          // ignore
        }
      }

      const roofAreaVal = projectRoof && typeof projectRoof === 'object' ? (projectRoof as { area?: number }).area : undefined
      const hasRoof = typeof roofAreaVal === 'number' && roofAreaVal > 0
      if (!results && !foundation && !hasRoof) {
        setSaveMessage('Добавьте данные стен, фундамента или крыши для сохранения PDF.')
        setTimeout(() => setSaveMessage(null), 4000)
        return false
      }

      const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
      const openings = Array.isArray(projectToSave.data.openings)
        ? projectToSave.data.openings.map((o) => ({
            width: o.width,
            height: o.height,
            ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}),
            ...(o.wall != null ? { wall: o.wall } : {}),
          }))
        : []
      const roofPayload =
        projectRoof && typeof projectRoof === 'object' && projectRoof !== null
          ? { roof: projectRoof as import('@/lib/pdf/generatePdfClient').RoofData }
          : {}
      const fullPayload = results
        ? {
            title: projectToSave.name.trim() || 'Проект строительства',
            includeMeta: includePdfMeta,
            pdfComment: projectToSave.pdfComment,
            materialLabel,
            principleLabel,
            dims: (projectToSave.type === 'walls_2'
              ? {
                  width: projectToSave.data.width,
                  length: projectToSave.data.length,
                  height: projectToSave.data.height,
                  thickness: projectToSave.data.thickness,
                }
              : projectToSave.type === 'walls_3'
                ? {
                    left: projectToSave.data.left,
                    back: projectToSave.data.back,
                    right: projectToSave.data.right,
                    height: projectToSave.data.height,
                    thickness: projectToSave.data.thickness,
                  }
                : {
                    width: projectToSave.data.width,
                    length: projectToSave.data.length,
                    height: projectToSave.data.height,
                    thickness: projectToSave.data.thickness,
                  }) as { width: number; length: number; height: number; thickness: number },
            results,
            openings,
            type: projectToSave.type,
            foundation,
            ...roofPayload,
            ...(projectToSave.resultsOverrides && Object.keys(projectToSave.resultsOverrides).length > 0 ? { resultsOverrides: projectToSave.resultsOverrides } : {}),
          }
        : {
            title: projectToSave.name.trim() || 'Проект строительства',
            includeMeta: includePdfMeta,
            pdfComment: projectToSave.pdfComment,
            skipWalls: true as const,
            type: projectToSave.type,
            foundation,
            ...roofPayload,
            ...(projectToSave.resultsOverrides && Object.keys(projectToSave.resultsOverrides).length > 0 ? { resultsOverrides: projectToSave.resultsOverrides } : {}),
          }
      let pdfBytes: Uint8Array
      if (projectToSave.type === 'walls_2' || projectToSave.type === 'walls_3' || projectToSave.type === 'walls_4') {
        pdfCapturePayloadRef.current = fullPayload
        setPdfCaptureExtras({ foundation, roof: projectRoof })
        setPdfCaptureProject(projectToSave)
        pdfBytes = await new Promise<Uint8Array>((resolve) => {
          pdfCaptureResolveRef.current = resolve
        })
      } else {
        pdfBytes = await generatePdfClient(fullPayload)
      }

      const filename = filenameToUse

      function uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
      }
      const base64Data = uint8ArrayToBase64(pdfBytes)

      if (Capacitor.isNativePlatform()) {
        const { savePdfToDevice, getSavedPdfUri } = await import('@/lib/pdf/pdfStorage')
        const result = await savePdfToDevice(filename, pdfBytes)
        if (!result) return false
        const updatedProject = {
          ...projectToSave,
          updatedAt: new Date().toISOString(),
          pdfFilename: filename,
        }
        ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
        try {
          await saveProjectToDevice(updatedProject)
        } finally {
          ;(window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
        }
        if (overwroteExistingWithSameName && project.id !== updatedProject.id) {
          deleteLocalProject(project.id)
          try {
            await deleteDeviceProject(project.id)
          } catch {
            // ignore
          }
        }
        onProjectUpdated?.(updatedProject)
        // Всегда открываем из папки: uri/path с устройства
        const saved = getSavedPdfUri(filename)
        const uri = saved?.uri ?? (typeof result === 'string' ? result : result.uri)
        const filePath = saved?.path ?? (typeof result === 'string' ? undefined : result.path)
        sessionStorage.setItem('pdfViewerUri', uri)
        sessionStorage.setItem('pdfViewerFilename', filename)
        if (filePath) sessionStorage.setItem('pdfViewerFilePath', filePath)
        sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
        sessionStorage.setItem(
          'pdfViewerPdfData',
          JSON.stringify({
            projectName: projectToSave.name.trim() || 'Проект строительства',
            projectType: projectToSave.type,
            materialLabel,
            principleLabel,
          }),
        )
        setSavedPdfUri('saved')
        sessionStorage.setItem('projectIsDirty', 'false')
        setIsDirty(false)
        window.dispatchEvent(new CustomEvent('projectDataChanged'))
        if (nameChanged) {
          router.push(`/projects/view?id=${encodeURIComponent(projectToSave.id)}`)
          return true
        }
        if (openViewer && nameChanged) {
          sessionStorage.removeItem('pdfViewerReturnTo')
          router.push(`/pdf-viewer?uri=${encodeURIComponent(uri)}&filename=${encodeURIComponent(filename)}`)
        }
        return true
      }

      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const updatedProject = {
        ...projectToSave,
        updatedAt: new Date().toISOString(),
        pdfFilename: filename,
      }
      upsertLocalProject(updatedProject)
      if (overwroteExistingWithSameName && project.id !== updatedProject.id) {
        deleteLocalProject(project.id)
        if (Capacitor.isNativePlatform()) {
          try {
            await deleteDeviceProject(project.id)
          } catch {
            // ignore
          }
        }
      }
      onProjectUpdated?.(updatedProject)
      sessionStorage.setItem('pdfViewerUri', url)
      sessionStorage.setItem('pdfViewerFilename', filename)
      sessionStorage.setItem('pdfViewerPdfBytes', base64Data)
      sessionStorage.setItem(
        'pdfViewerPdfData',
        JSON.stringify({
          projectName: projectToSave.name.trim() || 'Проект строительства',
          projectType: projectToSave.type,
          materialLabel,
          principleLabel,
        }),
      )
      setSavedPdfUri(url)
      sessionStorage.setItem('projectIsDirty', 'false')
      setIsDirty(false)
      window.dispatchEvent(new CustomEvent('projectDataChanged'))
      if (nameChanged) {
        router.push(`/projects/view?id=${encodeURIComponent(projectToSave.id)}`)
        return true
      }
      if (openViewer && nameChanged) {
        sessionStorage.removeItem('pdfViewerReturnTo')
        router.push(`/pdf-viewer?uri=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
      }
      return true
    } catch {
      setSaveMessage('Не удалось сохранить. Попробуйте ещё раз.')
      setTimeout(() => setSaveMessage(null), 4000)
      return false
    }
  }

  const onConfirmOverwrite = () => {
    setShowOverwriteConfirm(false)
    const openViewer = pendingSaveOpenViewerRef.current
    void handleSavePdf(openViewer, true)
  }

  const onCancelOverwrite = () => {
    setShowOverwriteConfirm(false)
    setSaveMessage('Сохранение отменено.')
    setTimeout(() => setSaveMessage(null), 3000)
  }

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      {/* Скрытый блок для захвата большой визуализации в PDF (walls_2, walls_3, walls_4) */}
      {pdfCaptureProject && pdfCaptureExtras ? (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[-1] flex flex-col gap-4 bg-stone-100 p-4 opacity-0"
          style={{ width: 820, minHeight: 1 }}
        >
          {pdfCaptureProject.type === 'walls_2' && (
            <>
              {pdfCaptureExtras.foundation && typeof pdfCaptureExtras.foundation === 'object' && 'width' in pdfCaptureExtras.foundation ? (
                <DetailPlanFoundationWalls2
                  width={Number((pdfCaptureExtras.foundation as { width?: number }).width) || 5}
                  length={Number((pdfCaptureExtras.foundation as { length?: number }).length) || 5}
                  thickness={Number((pdfCaptureExtras.foundation as { thickness?: number }).thickness) ?? 0.25}
                  principle={(pdfCaptureExtras.foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'}
                  embedOnly
                  onClose={() => {}}
                />
              ) : null}
              <DetailPlanWallsWalls2 project={pdfCaptureProject as Extract<LocalProject, { type: 'walls_2' }>} embedOnly onClose={() => {}} />
              {pdfCaptureExtras.roof && typeof pdfCaptureExtras.roof === 'object' && 'width' in pdfCaptureExtras.roof ? (
                <DetailPlanRoofWalls2
                  width={Number((pdfCaptureExtras.roof as { width?: number }).width) || 5}
                  length={Number((pdfCaptureExtras.roof as { length?: number }).length) || 5}
                  overhang={Number((pdfCaptureExtras.roof as { overhang?: number }).overhang) ?? 0.4}
                  height={Number((pdfCaptureExtras.roof as { height?: number }).height) ?? 0.5}
                  slopeToward={Number((pdfCaptureExtras.roof as { slopeToward?: number }).slopeToward) === 1 ? 1 : 0}
                  embedOnly
                  onClose={() => {}}
                />
              ) : null}
            </>
          )}
          {pdfCaptureProject.type === 'walls_3' && (
            <>
              {pdfCaptureExtras.foundation && typeof pdfCaptureExtras.foundation === 'object' && 'left' in pdfCaptureExtras.foundation ? (
                <DetailPlanFoundationWalls3
                  left={Number((pdfCaptureExtras.foundation as { left?: number }).left) || 3}
                  back={Number((pdfCaptureExtras.foundation as { back?: number }).back) || 5}
                  right={Number((pdfCaptureExtras.foundation as { right?: number }).right) || 3}
                  thickness={Number((pdfCaptureExtras.foundation as { thickness?: number }).thickness) ?? 0.25}
                  principle={(pdfCaptureExtras.foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'}
                  embedOnly
                  onClose={() => {}}
                />
              ) : null}
              <DetailPlanWallsWalls3 project={pdfCaptureProject as Extract<LocalProject, { type: 'walls_3' }>} embedOnly onClose={() => {}} />
              {pdfCaptureExtras.roof && typeof pdfCaptureExtras.roof === 'object' && 'left' in pdfCaptureExtras.roof ? (
                <DetailPlanRoofWalls3
                  left={Number((pdfCaptureExtras.roof as { left?: number }).left) || 3}
                  back={Number((pdfCaptureExtras.roof as { back?: number }).back) || 5}
                  right={Number((pdfCaptureExtras.roof as { right?: number }).right) || 3}
                  overhang={Number((pdfCaptureExtras.roof as { overhang?: number }).overhang) ?? 0.4}
                  height={Number((pdfCaptureExtras.roof as { height?: number }).height) ?? 0.5}
                  embedOnly
                  onClose={() => {}}
                />
              ) : null}
            </>
          )}
          {pdfCaptureProject.type === 'walls_4' && (
            <>
              {pdfCaptureExtras.foundation && typeof pdfCaptureExtras.foundation === 'object' && 'width' in pdfCaptureExtras.foundation ? (
                <DetailPlanFoundationWalls4
                  width={Number((pdfCaptureExtras.foundation as { width?: number }).width) || 5}
                  length={Number((pdfCaptureExtras.foundation as { length?: number }).length) || 5}
                  thickness={Number((pdfCaptureExtras.foundation as { thickness?: number }).thickness) ?? 0.25}
                  principle={(pdfCaptureExtras.foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'}
                  embedOnly
                  onClose={() => {}}
                />
              ) : null}
              <DetailPlanWallsWalls4 project={pdfCaptureProject as Extract<LocalProject, { type: 'walls_4' }>} embedOnly onClose={() => {}} />
              {pdfCaptureExtras.roof && typeof pdfCaptureExtras.roof === 'object' && 'width' in pdfCaptureExtras.roof ? (
                <DetailPlanRoofWalls4
                  width={Number((pdfCaptureExtras.roof as { width?: number }).width) || 5}
                  length={Number((pdfCaptureExtras.roof as { length?: number }).length) || 5}
                  overhang={Number((pdfCaptureExtras.roof as { overhang?: number }).overhang) ?? 0.4}
                  height={Number((pdfCaptureExtras.roof as { height?: number }).height) ?? 0.5}
                  roofType={((pdfCaptureExtras.roof as { type?: string }).type === 'gable' ? 'gable' : 'single') as 'single' | 'gable'}
                  ridgeAlongLength={typeof (pdfCaptureExtras.roof as unknown as { ridgeAlongLength?: boolean }).ridgeAlongLength === 'boolean' ? (pdfCaptureExtras.roof as unknown as { ridgeAlongLength: boolean }).ridgeAlongLength : true}
                  embedOnly
                  onClose={() => {}}
                />
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <header className="border-b border-white/8 bg-[#10161f]">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {activeTab === 'none' ? (
              <BackButton
                fallbackHref="/project"
                registerHardwareBack={false}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#1a2230] px-3 py-2.5 text-sm font-medium text-white"
              >
                <BackIcon className="h-5 w-5" aria-label="Назад" />
              </BackButton>
            ) : (
              <button
                type="button"
                onClick={closeActiveTab}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#1a2230] px-3 py-2.5 text-sm font-medium text-white"
              >
                <BackIcon className="h-5 w-5" aria-label="Назад к проекту" />
              </button>
            )}
            <h1 className="text-2xl font-bold truncate max-w-[70%]">{PROJECT_TYPE_TITLES[project.type] ?? project.name}</h1>
            {activeTab === 'none' ? (
              <button
                type="button"
                onClick={() => void handleSavePdf(false)}
                disabled={!isDirtyEffective}
                aria-label="Сохранить PDF"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isDirtyEffective
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'cursor-not-allowed bg-white/10 text-zinc-500'
                }`}
              >
                <DownloadIcon className="h-5 w-5" aria-hidden />
              </button>
            ) : (
              <div className="w-[88px]" />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {activeTab === 'none' && (
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-white mb-4">{project.name}</h2>
          <div className="mt-0 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setActiveTab('foundation')}
              className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
            >
              <img src="/projects/create/foundation.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
              <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
                <div className="flex items-center gap-2">
                  <FoundationIcon className="h-6 w-6 shrink-0 text-white" />
                  <span className="text-base font-semibold text-white drop-shadow-sm">Фундамент</span>
                </div>
                {(() => {
                  const variant = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
                  const manual = getFoundationRoofOverridesFromStorage(variant).foundationVolume
                  const value = manual != null && Number.isFinite(manual) ? manual : foundationResult?.volume
                  return value != null ? (
                    <span className="text-xs font-normal text-zinc-300">{Number(value).toFixed(2).replace('.', ',')} м³</span>
                  ) : null
                })()}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('walls')}
              className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
            >
              <img src="/projects/create/walls.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
              <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
                <div className="flex items-center gap-2">
                  <WallsIcon className="h-6 w-6 shrink-0 text-white" />
                  <span className="text-base font-semibold text-white drop-shadow-sm">Стены</span>
                </div>
                {(() => {
                  const variant = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
                  const fromStorage = getWallsOverridesFromStorage(variant)
                  const area = fromStorage.wallsArea != null && Number.isFinite(fromStorage.wallsArea) ? fromStorage.wallsArea : wallSummary?.area
                  const volume = fromStorage.wallsVolume != null && Number.isFinite(fromStorage.wallsVolume) ? fromStorage.wallsVolume : wallSummary?.volume
                  const show = (wallSummary != null || area != null || volume != null) && (area != null || volume != null)
                  return show ? (
                    <span className="text-center text-xs font-normal text-zinc-300">{(area ?? 0).toFixed(2).replace('.', ',')} м² · {(volume ?? 0).toFixed(2).replace('.', ',')} м³</span>
                  ) : null
                })()}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roof')}
              className="relative min-h-[100px] w-full overflow-hidden rounded-2xl text-left shadow-md transition-opacity hover:opacity-95"
            >
              <img src="/projects/create/roof.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50" aria-hidden />
              <div className="relative z-10 flex min-h-[100px] flex-col items-center justify-center gap-1.5 px-4 py-4">
                <div className="flex items-center gap-2">
                  <RoofIcon className="h-6 w-6 shrink-0 text-white" />
                  <span className="text-base font-semibold text-white drop-shadow-sm">Крыша</span>
                </div>
                {(() => {
                  const variant = project.type === 'walls_2' ? '2' : project.type === 'walls_3' ? '3' : '4'
                  const manual = getFoundationRoofOverridesFromStorage(variant).roofArea
                  const value = manual != null && Number.isFinite(manual) ? manual : roofResult?.area
                  return value != null ? (
                    <span className="text-xs font-normal text-zinc-300">{Number(value).toFixed(2).replace('.', ',')} м²</span>
                  ) : null
                })()}
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
                    sessionStorage.setItem('projectIsDirty', 'true')
                    setIsDirty(true)
                    setSavedPdfUri(null)
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
                    sessionStorage.setItem('projectIsDirty', 'true')
                    setIsDirty(true)
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

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-col gap-3">
              {saveMessage && (
                <p className="text-sm text-amber-400" role="status">
                  {saveMessage}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  if (isPdfSaved && !isDirtyEffective) {
                    void openSavedPdf()
                  } else {
                    void handleSavePdf(true)
                  }
                }}
                disabled={!isPdfButtonActive}
                className={`inline-flex items-center justify-center gap-2 w-full rounded-xl px-6 py-4 text-base font-semibold transition-colors sm:flex-1 ${
                  isPdfButtonActive
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'cursor-not-allowed bg-white/10 text-zinc-500'
                }`}
              >
                <DownloadIcon className="h-5 w-5" />
                {isPdfSaved && !isDirtyEffective ? 'Открыть PDF' : 'Сохранить в PDF'}
              </button>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={includePdfMeta}
                  onChange={(e) => {
                    const includePdfMetaKey = project.type === 'walls_2' ? 'includePdfMeta_walls_2' : project.type === 'walls_3' ? 'includePdfMeta_walls_3' : 'includePdfMeta_walls_4'
                    setIncludePdfMeta(e.target.checked)
                    sessionStorage.setItem(includePdfMetaKey, String(e.target.checked))
                    sessionStorage.setItem('projectIsDirty', 'true')
                    setIsDirty(true)
                    sessionStorage.removeItem('pdfViewerUri')
                    window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  }}
                  className="android-checkbox"
                />
                Подписать PDF
              </label>
              </div>
              <p className="mt-4 text-center text-xs text-zinc-500">
                Расчёт носит ознакомительный характер. Для точных данных рекомендуется обратиться к специалисту.
              </p>
            </div>
          </div>
        </div>
        )}

        {activeTab !== 'none' && (
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            {activeTab === 'foundation' && (
              <>
                {project.type === 'walls_2' && (
                  <DirtyProvider>
                    <FoundationPage {...({ embedInView: true, onSchemaClick: () => openDetailView('foundation'), initialProject: project } as React.ComponentProps<typeof FoundationPage>)} />
                  </DirtyProvider>
                )}
                {project.type === 'walls_3' && (
                  <DirtyProvider>
                    <FoundationPage3 {...({ embedInView: true, onSchemaClick: () => openDetailView('foundation'), initialProject: project } as React.ComponentProps<typeof FoundationPage3>)} />
                  </DirtyProvider>
                )}
                {project.type === 'walls_4' && (
                  <DirtyProvider>
                    <FoundationPage4 {...({ embedInView: true, onSchemaClick: () => openDetailView('foundation'), initialProject: project } as React.ComponentProps<typeof FoundationPage4>)} />
                  </DirtyProvider>
                )}
              </>
            )}

            {activeTab === 'walls' && (
              <>
                {project.type === 'walls_2' && (
                  <WallsCalculator mode="edit" projectId={project.id} initialProject={project} embedInView onSchemaClick={() => openDetailView('walls')} />
                )}
                {project.type === 'walls_3' && (
                  <Walls3Calculator mode="edit" projectId={project.id} initialProject={project} embedInView onSchemaClick={() => openDetailView('walls')} />
                )}
                {project.type === 'walls_4' && (
                  <Walls4Calculator
                    mode="edit"
                    projectId={project.id}
                    initialProject={project}
                    embedInView
                    onSchemaClick={() => openDetailView('walls')}
                    onOpeningsChange={(nextOpenings) => {
                      const nextData = { ...project.data, openings: nextOpenings }
                      const next = { ...project, data: nextData }
                      onProjectUpdated?.(next)
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('projectIsDirty', 'true')
                        sessionStorage.setItem('currentProjectData_walls_4', JSON.stringify({ ...nextData, projectId: project.id }))
                        window.dispatchEvent(new CustomEvent('projectDataChanged'))
                      }
                    }}
                  />
                )}
              </>
            )}

            {activeTab === 'roof' && (
              <>
                {project.type === 'walls_2' && <RoofPage2 embedInView onSchemaClick={() => openDetailView('roof')} initialProject={project} />}
                {project.type === 'walls_3' && <RoofPage3 {...({ embedInView: true, onSchemaClick: () => openDetailView('roof'), initialProject: project } as React.ComponentProps<typeof RoofPage3>)} />}
                {project.type === 'walls_4' && <RoofPage4 {...({ embedInView: true, onSchemaClick: () => openDetailView('roof'), initialProject: project } as React.ComponentProps<typeof RoofPage4>)} />}
              </>
            )}
          </div>
        )}
      </main>

      {detailView === 'foundation' && project.type === 'walls_2' && (() => {
        let w = Number((project.foundation as { width?: number })?.width) || Number(project.data.width) || 5
        let len = Number((project.foundation as { length?: number })?.length) || Number(project.data.length) || 5
        let thickness = Number((project.foundation as { thickness?: number })?.thickness) ?? 0.25
        let principle: 'inside' | 'outside' = (project.foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_foundation_2')
            if (raw) {
              const d = JSON.parse(raw) as { width?: number; length?: number; thickness?: number; principle?: 'inside' | 'outside' }
              if (Number(d.width) > 0) w = Number(d.width)
              if (Number(d.length) > 0) len = Number(d.length)
              if (Number(d.thickness) >= 0) thickness = Number(d.thickness)
              if (d.principle === 'inside' || d.principle === 'outside') principle = d.principle
            }
          } catch {
            // ignore
          }
        }
        return (
          <DetailPlanFoundationWalls2
            width={w}
            length={len}
            thickness={thickness}
            principle={principle}
            onClose={closeDetailView}
          />
        )
      })()}
      {detailView === 'walls' && project.type === 'walls_2' && (() => {
        let data = project.data
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_walls_2')
            if (raw) {
              const parsed = JSON.parse(raw) as { projectId?: string; principle?: string; width?: number; length?: number; height?: number; thickness?: number; openings?: unknown[] }
              const belongsToCurrentProject = parsed?.projectId === project.id
              if (belongsToCurrentProject && parsed && (parsed.width !== undefined || parsed.length !== undefined || parsed.principle !== undefined || Array.isArray(parsed.openings))) {
                const d = project.data as { width: number; length: number; height: number; thickness: number; principle?: string; openings?: Opening[] }
                data = {
                  ...project.data,
                  principle: (parsed.principle === 'outside' ? 'outside' : (parsed.principle === 'inside' ? 'inside' : (d.principle ?? 'inside'))) as 'inside' | 'outside',
                  width: Number(parsed.width) > 0 ? Number(parsed.width) : (d.width ?? 0),
                  length: Number(parsed.length) > 0 ? Number(parsed.length) : (d.length ?? 0),
                  height: Number(parsed.height) > 0 ? Number(parsed.height) : (d.height ?? 0),
                  thickness: Number(parsed.thickness) > 0 ? Number(parsed.thickness) : (d.thickness ?? 0),
                  openings: Array.isArray(parsed.openings) ? (parsed.openings as Opening[]) : (d.openings ?? []),
                }
              }
            }
          } catch {
            // ignore
          }
        }
        const projectWithStorage = { ...project, data }
        return (
          <DetailPlanWallsWalls2
            project={projectWithStorage}
            onClose={closeDetailView}
            onOpeningsChange={(nextOpenings) => {
              const nextData = { ...data, openings: nextOpenings }
              const next = { ...project, data: nextData, updatedAt: new Date().toISOString() }
              onProjectUpdated?.(next)
              setIsDirty(true)
              sessionStorage.setItem('projectIsDirty', 'true')
              sessionStorage.setItem('currentProjectData_walls_2', JSON.stringify({ ...nextData, projectId: project.id }))
              window.dispatchEvent(new CustomEvent('projectDataChanged'))
              if (Capacitor.isNativePlatform()) {
                saveProjectToDevice(next).catch(() => {})
              } else {
                upsertLocalProject(next)
              }
            }}
          />
        )
      })()}
      {detailView === 'roof' && project.type === 'walls_2' && (() => {
        let w = Number((project.roof as { width?: number })?.width) || Number(project.data.width) || 5
        let len = Number((project.roof as { length?: number })?.length) || Number(project.data.length) || 5
        let overhang = Number((project.roof as { overhang?: number })?.overhang) ?? 0.4
        let height = Number((project.roof as { height?: number })?.height) ?? 0.5
        let slopeToward: 0 | 1 = 0
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_roof_2')
            if (raw) {
              const d = JSON.parse(raw) as { width?: number; length?: number; overhang?: number; height?: number; slopeToward?: number }
              if (Number(d.width) > 0) w = Number(d.width)
              if (Number(d.length) > 0) len = Number(d.length)
              if (Number(d.overhang) >= 0) overhang = Number(d.overhang)
              if (Number(d.height) >= 0) height = Number(d.height)
              if (d.slopeToward === 1) slopeToward = 1
            }
          } catch {
            // ignore
          }
        }
        if (slopeToward === 0 && Number((project.roof as { slopeToward?: number })?.slopeToward) === 1) slopeToward = 1
        return (
          <DetailPlanRoofWalls2
            width={w}
            length={len}
            overhang={overhang}
            height={height}
            slopeToward={slopeToward}
            onClose={closeDetailView}
          />
        )
      })()}

      {detailView === 'foundation' && project.type === 'walls_3' && (() => {
        let left = Number((project.foundation as { left?: number })?.left) || Number(project.data.left) || 3
        let back = Number((project.foundation as { back?: number })?.back) || Number(project.data.back) || 5
        let right = Number((project.foundation as { right?: number })?.right) || Number(project.data.right) || 3
        let thickness = Number((project.foundation as { thickness?: number })?.thickness) ?? 0.25
        let principle: 'inside' | 'outside' = (project.foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_foundation_3')
            if (raw) {
              const d = JSON.parse(raw) as { left?: number; back?: number; right?: number; thickness?: number; principle?: 'inside' | 'outside' }
              if (Number(d.left) > 0) left = Number(d.left)
              if (Number(d.back) > 0) back = Number(d.back)
              if (Number(d.right) > 0) right = Number(d.right)
              if (Number(d.thickness) >= 0) thickness = Number(d.thickness)
              if (d.principle === 'inside' || d.principle === 'outside') principle = d.principle
            }
          } catch {
            // ignore
          }
        }
        return (
          <DetailPlanFoundationWalls3 left={left} back={back} right={right} thickness={thickness} principle={principle} onClose={closeDetailView} />
        )
      })()}
      {detailView === 'foundation' && project.type === 'walls_4' && (() => {
        let width = Number((project.foundation as { width?: number })?.width) || Number(project.data.width) || 5
        let length = Number((project.foundation as { length?: number })?.length) || Number(project.data.length) || 5
        let thickness = Number((project.foundation as { thickness?: number })?.thickness) ?? 0.25
        let principle: 'inside' | 'outside' = (project.foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_foundation_4')
            if (raw) {
              const d = JSON.parse(raw) as { width?: number; length?: number; thickness?: number; principle?: 'inside' | 'outside' }
              if (Number(d.width) > 0) width = Number(d.width)
              if (Number(d.length) > 0) length = Number(d.length)
              if (Number(d.thickness) >= 0) thickness = Number(d.thickness)
              if (d.principle === 'inside' || d.principle === 'outside') principle = d.principle
            }
          } catch {
            // ignore
          }
        }
        return (
          <DetailPlanFoundationWalls4 width={width} length={length} thickness={thickness} principle={principle} onClose={closeDetailView} />
        )
      })()}

      {detailView === 'walls' && project.type === 'walls_3' && (() => {
        let data = project.data
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_walls_3')
            if (raw) {
              const parsed = JSON.parse(raw) as { left?: number; back?: number; right?: number; height?: number; thickness?: number; principle?: string; openings?: unknown[] }
              if (parsed && (parsed.left !== undefined || parsed.back !== undefined || parsed.principle !== undefined || (Array.isArray(parsed.openings) && parsed.openings.length > 0))) {
                const d = project.data as { left: number; back: number; right: number; height: number; thickness: number; principle?: 'inside' | 'outside'; openings?: Opening[] }
                const useStorageOpenings = Array.isArray(parsed.openings) && parsed.openings.length > 0
                data = {
                  ...project.data,
                  left: Number(parsed.left) > 0 ? Number(parsed.left) : (d.left ?? 0),
                  back: Number(parsed.back) > 0 ? Number(parsed.back) : (d.back ?? 0),
                  right: Number(parsed.right) > 0 ? Number(parsed.right) : (d.right ?? 0),
                  height: Number(parsed.height) > 0 ? Number(parsed.height) : (d.height ?? 0),
                  thickness: Number(parsed.thickness) > 0 ? Number(parsed.thickness) : (d.thickness ?? 0),
                  principle: (parsed.principle === 'outside' || parsed.principle === 'inside') ? parsed.principle : (d.principle ?? 'inside'),
                  openings: useStorageOpenings ? (parsed.openings as Opening[]) : (d.openings ?? []),
                }
              }
            }
          } catch {
            // ignore
          }
        }
        const projectWithStorage = { ...project, data } as Extract<LocalProject, { type: 'walls_3' }>
        return (
          <DetailPlanWallsWalls3
            project={projectWithStorage}
            onClose={closeDetailView}
            onOpeningsChange={(nextOpenings) => {
              const next = { ...project, data: { ...project.data, openings: nextOpenings }, updatedAt: new Date().toISOString() }
              onProjectUpdated?.(next)
              setIsDirty(true)
              sessionStorage.setItem('projectIsDirty', 'true')
              sessionStorage.setItem('currentProjectData_walls_3', JSON.stringify({ ...project.data, openings: nextOpenings, projectId: project.id }))
              window.dispatchEvent(new CustomEvent('projectDataChanged'))
              if (Capacitor.isNativePlatform()) {
                saveProjectToDevice(next).catch(() => {})
              } else {
                upsertLocalProject(next)
              }
            }}
          />
        )
      })()}
      {detailView === 'walls' && project.type === 'walls_4' && (() => {
        let data = project.data
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_walls_4')
            if (raw) {
              const parsed = JSON.parse(raw) as { projectId?: string; width?: number; length?: number; height?: number; thickness?: number; openings?: unknown[]; principle?: string }
              const belongsToCurrentProject = parsed?.projectId === project.id
              if (belongsToCurrentProject && parsed && (parsed.width !== undefined || parsed.length !== undefined || Array.isArray(parsed.openings) || parsed.principle !== undefined)) {
                const d = project.data as { width: number; length: number; height: number; thickness: number; openings?: Opening[]; principle?: 'inside' | 'outside' }
                data = {
                  ...project.data,
                  width: Number(parsed.width) > 0 ? Number(parsed.width) : (d.width ?? 0),
                  length: Number(parsed.length) > 0 ? Number(parsed.length) : (d.length ?? 0),
                  height: Number(parsed.height) > 0 ? Number(parsed.height) : (d.height ?? 0),
                  thickness: Number(parsed.thickness) > 0 ? Number(parsed.thickness) : (d.thickness ?? 0),
                  openings: Array.isArray(parsed.openings) ? (parsed.openings as Opening[]) : (d.openings ?? []),
                  principle: (parsed.principle === 'inside' || parsed.principle === 'outside') ? parsed.principle : (d.principle ?? 'inside'),
                }
              }
            }
          } catch {
            // ignore
          }
        }
        const projectWithStorage = { ...project, data } as Extract<LocalProject, { type: 'walls_4' }>
        return (
          <DetailPlanWallsWalls4
            project={projectWithStorage}
            onOpeningsChange={(nextOpenings) => {
              const nextData = { ...projectWithStorage.data, openings: nextOpenings }
              const updated = { ...projectWithStorage, data: nextData, updatedAt: new Date().toISOString() }
              onProjectUpdated?.(updated)
              setIsDirty(true)
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.setItem('currentProjectData_walls_4', JSON.stringify({ ...nextData, projectId: project.id }))
                  sessionStorage.setItem('projectIsDirty', 'true')
                  window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  if (Capacitor.isNativePlatform()) {
                    saveProjectToDevice(updated).catch(() => {})
                  } else {
                    upsertLocalProject(updated)
                  }
                } catch {
                  // ignore
                }
              }
            }}
            onClose={closeDetailView}
          />
        )
      })()}

      {detailView === 'roof' && project.type === 'walls_3' && (() => {
        let left = Number((project.roof as { left?: number })?.left) || Number(project.data.left) || 3
        let back = Number((project.roof as { back?: number })?.back) || Number(project.data.back) || 5
        let right = Number((project.roof as { right?: number })?.right) || Number(project.data.right) || 3
        let overhang = Number((project.roof as { overhang?: number })?.overhang) ?? 0.4
        let height = Number((project.roof as { height?: number })?.height) ?? 0.5
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_roof_3')
            if (raw) {
              const d = JSON.parse(raw) as { left?: number; back?: number; right?: number; overhang?: number; height?: number }
              if (Number(d.left) > 0) left = Number(d.left)
              if (Number(d.back) > 0) back = Number(d.back)
              if (Number(d.right) > 0) right = Number(d.right)
              if (Number(d.overhang) >= 0) overhang = Number(d.overhang)
              if (Number(d.height) >= 0) height = Number(d.height)
            }
          } catch {
            // ignore
          }
        }
        return (
          <DetailPlanRoofWalls3 left={left} back={back} right={right} overhang={overhang} height={height} onClose={closeDetailView} />
        )
      })()}
      {detailView === 'roof' && project.type === 'walls_4' && (() => {
        let width = Number((project.roof as { width?: number })?.width) || Number(project.data.width) || 5
        let length = Number((project.roof as { length?: number })?.length) || Number(project.data.length) || 5
        let overhang = Number((project.roof as { overhang?: number })?.overhang) ?? 0.4
        let height = Number((project.roof as { height?: number })?.height) ?? 0.5
        let roofType: 'single' | 'gable' = 'single'
        let ridgeAlongLength = true
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_roof_4')
            if (raw) {
              const d = JSON.parse(raw) as { width?: number; length?: number; overhang?: number; height?: number; type?: string; ridgeAlongLength?: boolean }
              if (Number(d.width) > 0) width = Number(d.width)
              if (Number(d.length) > 0) length = Number(d.length)
              if (Number(d.overhang) >= 0) overhang = Number(d.overhang)
              if (Number(d.height) >= 0) height = Number(d.height)
              if (d.type === 'gable') roofType = 'gable'
              if (typeof d.ridgeAlongLength === 'boolean') ridgeAlongLength = d.ridgeAlongLength
            }
          } catch {
            // ignore
          }
        }
        return (
          <DetailPlanRoofWalls4 width={width} length={length} overhang={overhang} height={height} roofType={roofType} ridgeAlongLength={ridgeAlongLength} onClose={closeDetailView} />
        )
      })()}

      {showOverwriteConfirm && (
        <ConfirmModal
          isOpen
          onClose={onCancelOverwrite}
          onConfirm={onConfirmOverwrite}
          title="Перезаписать проект и PDF?"
          description={`Текущие данные проекта «${project.name.trim() || 'Проект'}» и PDF будут сохранены.`}
          confirmLabel="Перезаписать"
          cancelLabel="Отмена"
        />
      )}

      {showConcreteGradeRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowConcreteGradeRequiredModal(false)}
          />
          <div className="android-panel relative z-10 mx-4 w-full max-w-md p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Выберите марку бетона
            </h2>
            <p className="mb-6 text-base text-zinc-300">
              Необходимо выбрать марку бетона перед выходом из раздела.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowConcreteGradeRequiredModal(false)}
                className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectViewPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Загрузка...</p>
      </div>
    }>
      <ProjectViewContent />
    </Suspense>
  )
}


