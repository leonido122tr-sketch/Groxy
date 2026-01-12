'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import {
  makeProjectId,
  upsertLocalProject,
  listLocalProjects,
  deleteLocalProject,
  type LocalProject,
  type Opening,
  type Principle,
} from '@/lib/projects/localProjects'
import { saveProjectToDevice, listDeviceProjects, deleteDeviceProject } from '@/lib/projects/deviceProjects'
import { Capacitor } from '@capacitor/core'

type Props = {
  mode: 'create' | 'edit'
  projectId?: string
  initialProject?: Extract<LocalProject, { type: 'walls_2' }>
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
  return v.toFixed(1).replace('.', ',')
}

function parseRuDecimal(value: string) {
  const cleaned = value.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function sanitizeRuDecimalInput(raw: string, maxDecimals = 2) {
  // Allow only digits and a single comma. Limit decimals to maxDecimals.
  // Examples:
  // - "1,1,1" -> "1,1"
  // - "ab12,34" -> "12,3" (maxDecimals=1)
  // - ",5" -> "0,5"
  // Accept both "." and "," while typing.
  // Keep the first separator the user typed ('.' or ',') so it feels like "dot works".
  const filtered = raw.replace(/[^\d,\.]/g, '')
  const firstSepIdx = filtered.search(/[.,]/)
  const sep = firstSepIdx >= 0 ? filtered[firstSepIdx] : null

  const intPartRaw = (sep ? filtered.slice(0, firstSepIdx) : filtered).replace(/[.,]/g, '')
  const rest = sep ? filtered.slice(firstSepIdx + 1) : ''
  const decRaw = rest.replace(/[.,]/g, '') // collapse extra separators

  let intPart = intPartRaw.replace(/^0+(?=\d)/, '') // trim leading zeros but keep one if needed
  if (intPart === '' && (raw.includes(',') || raw.startsWith(','))) intPart = '0'

  let out = intPart
  if (sep) {
    const dec = decRaw.slice(0, maxDecimals)
    out = `${intPart}${sep}${dec}`
    // allow trailing comma while typing
    if (dec.length === 0 && (raw.endsWith(',') || raw.endsWith('.'))) out = `${intPart}${sep}`
  }

  return out
}

export default function WallsCalculator({ mode, projectId, initialProject }: Props) {
  const router = useRouter()
  const init = initialProject?.data

  const [toast, setToast] = useState<string | null>(null)
  const [isMaterialOpen, setIsMaterialOpen] = useState(false)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)
  const [overwriteModalProject, setOverwriteModalProject] = useState<LocalProject | null>(null)
  const [pendingSave, setPendingSave] = useState<boolean>(false)
  const [isProjectSaved, setIsProjectSaved] = useState<boolean>(!!initialProject) // Проект считается сохранённым, если он был загружен
  const [currentProjectId, setCurrentProjectId] = useState<string>(projectId ?? initialProject?.id ?? '') // ID текущего проекта
  const [showSaveBeforeExitModal, setShowSaveBeforeExitModal] = useState<boolean>(false)
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null)

  const [principle, setPrinciple] = useState<Principle>(init?.principle ?? 'inside')
  const [activeWall, setActiveWall] = useState<1 | 2>(1)

  const [projectName, setProjectName] = useState(initialProject?.name ?? '')
  const [material, setMaterial] = useState(init?.material ?? '')

  const [widthText, setWidthText] = useState(init ? formatRu1(init.width) : '')
  const [lengthText, setLengthText] = useState(init ? formatRu1(init.length) : '')
  const [heightText, setHeightText] = useState(init ? formatRu1(init.height) : '')
  const [thicknessText, setThicknessText] = useState(init ? formatRu1(init.thickness) : '')

  const [width, setWidth] = useState(init?.width ?? 0)
  const [length, setLength] = useState(init?.length ?? 0)
  const [height, setHeight] = useState(init?.height ?? 0)
  const [thickness, setThickness] = useState(init?.thickness ?? 0)

  const [openings, setOpenings] = useState<Opening[]>(init?.openings ?? [])
  const [includePdfMeta, setIncludePdfMeta] = useState(false)
  const [isAddingOpening, setIsAddingOpening] = useState(false)
  const [openingWidthText, setOpeningWidthText] = useState('')
  const [openingHeightText, setOpeningHeightText] = useState('')
  const [note, setNote] = useState(init?.note ?? '')

  const widthRef = useRef<HTMLInputElement | null>(null)
  const lengthRef = useRef<HTMLInputElement | null>(null)
  // Стабильный ID черновика (нужен, чтобы можно было удалить его при "выйти без сохранения")
  const draftIdRef = useRef<string>('')
  // Жёсткая защита от автосохранения: сохраняем проект ТОЛЬКО при явном действии пользователя.
  const userInitiatedSaveRef = useRef(false)

  const runUserInitiatedSave = async <T,>(fn: () => Promise<T>): Promise<T> => {
    userInitiatedSaveRef.current = true
    ;(window as any).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = true
    try {
      return await fn()
    } finally {
      userInitiatedSaveRef.current = false
      ;(window as any).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ = false
    }
  }

  const dims = useMemo(() => {
    return {
      width: clampNonNeg(width),
      length: clampNonNeg(length),
      height: clampNonNeg(height),
      thickness: clampNonNeg(thickness),
    }
  }, [width, length, height, thickness])

  const results = useMemo(() => {
    if (dims.width === 0 || dims.length === 0 || dims.height === 0) return null
    // New wall calculation:
    // - For "inside": user inputs are inner sizes (2 walls). Add half thickness to each wall length.
    // - For "outside": user inputs are outer sizes. Subtract half thickness from each wall length.
    // Then:
    //   wallArea = (L1 + L2) * H - openingsArea
    //   volume = wallArea * thickness
    const t = clampNonNeg(dims.thickness)
    const adj = principle === 'inside' ? t / 2 : -t / 2

    const l1 = Math.max(0, dims.width + adj)
    const l2 = Math.max(0, dims.length + adj)

    const openingsArea = openings.reduce((sum, o) => sum + clampNonNeg(o.width) * clampNonNeg(o.height), 0)
    const areaWithOpenings = (l1 + l2) * dims.height
    const wallArea = Math.max(0, areaWithOpenings - openingsArea)
    const volume = Math.max(0, wallArea * t)

    // "Площадь" in UI = inside floor area.
    // - inside: width * length as provided
    // - outside: subtract half thickness from each dimension
    const innerAdj = principle === 'inside' ? 0 : -t / 2
    const innerWidth = Math.max(0, dims.width + innerAdj)
    const innerLength = Math.max(0, dims.length + innerAdj)
    const area = Math.max(0, innerWidth * innerLength)

    return { area, volume }
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
    
    console.log('[checkDuplicateName] Проверка дубликатов для:', name, 'excludeId:', excludeId)
    const trimmedName = name.trim()
    const isAndroid = Capacitor.isNativePlatform()
    
    // Проверяем веб-проекты
    const webProjects = listLocalProjects().filter(p => p.platform !== 'android')
    const webDuplicate = webProjects.find(p => p.name.trim() === trimmedName && p.id !== excludeId)
    if (webDuplicate) {
      console.log('[checkDuplicateName] Найден веб-дубликат:', webDuplicate)
      return webDuplicate
    }
    
    // Проверяем Android-проекты (если на Android)
    if (isAndroid) {
      try {
        console.log('[checkDuplicateName] Загрузка Android-проектов...')
        const deviceProjects = await listDeviceProjects()
        console.log('[checkDuplicateName] Загружено Android-проектов:', deviceProjects.length)
        const deviceDuplicate = deviceProjects.find(p => p.name.trim() === trimmedName && p.id !== excludeId)
        if (deviceDuplicate) {
          console.log('[checkDuplicateName] Найден Android-дубликат:', deviceDuplicate)
          return deviceDuplicate
        }
      } catch (error) {
        console.error('[checkDuplicateName] Ошибка при чтении устройств:', error)
        // Игнорируем ошибки при чтении устройств
      }
    }
    
    console.log('[checkDuplicateName] Дубликатов не найдено')
    return null
  }

  const persistProject = async (forceOverwrite = false, overwriteId?: string) => {
    if (!hasRequired) return null

    // Блокируем любые “случайные” вызовы сохранения (например, из побочных эффектов/навигации).
    if (!userInitiatedSaveRef.current) {
      console.warn('[persistProject] BLOCKED: попытка автосохранения без явного действия пользователя')
      return null
    }
    
    console.log('[persistProject] Сохранение проекта вызвано, forceOverwrite:', forceOverwrite, 'overwriteId:', overwriteId)
    const trimmedName = projectName.trim() || 'Проект'
    
    // Используем ID существующего проекта, если подтверждена перезапись
    let id = currentId && currentId.trim() ? currentId : getDraftId()
    if (forceOverwrite && overwriteId) {
      id = overwriteId
    }
    
    const now = new Date().toISOString()
    const isAndroid = Capacitor.isNativePlatform()
    const platform = isAndroid ? 'android' as const : 'web' as const
    
    const p: LocalProject = {
      id,
      name: trimmedName,
      type: 'walls_2',
      createdAt: overwriteModalProject?.createdAt || initialProject?.createdAt || now,
      updatedAt: now,
      data: { principle, material, width: dims.width, length: dims.length, height: dims.height, thickness: dims.thickness, openings, note: note.trim() || undefined },
      platform,
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
    // Проект считается изменённым, если есть обязательные поля и данные отличаются от начальных
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
        (note.trim() || '') !== (init?.note ?? '')
      
      if (hasChanges && isProjectSaved) {
        setIsProjectSaved(false)
      }
    }
  }, [projectName, material, principle, dims.width, dims.length, dims.height, dims.thickness, openings, note, hasRequired, initialProject, init, isProjectSaved])

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

    console.log('[makePdf] Создание PDF (НЕ должен вызывать сохранение проекта или проверку дубликатов)')
    // ВАЖНО: makePdf НЕ должен вызывать persistProject, saveProjectOnly, checkDuplicateAndSaveProject, или checkDuplicateName
    // Используем клиентскую генерацию PDF для работы в статическом экспорте и на Android
    const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
    const pdfBytes = await generatePdfClient({
      title: projectName.trim() || 'Проект строительства',
      includeMeta: includePdfMeta,
      materialLabel,
      principleLabel: principle === 'inside' ? 'Внутри' : 'Снаружи',
      dims,
      results,
      openings: openings.map((o) => ({ width: o.width, height: o.height })),
      type: 'walls_2',
    })
    console.log('[makePdf] PDF создан, размер:', pdfBytes.length, 'байт (НЕ должен был вызывать сохранение проекта)')
    return pdfBytes
  }

  const checkDuplicateAndSaveProject = async () => {
    const trimmedName = projectName.trim() || 'Проект'
    
    console.log('[checkDuplicateAndSaveProject] ВНИМАНИЕ: Эта функция вызывается для сохранения ПРОЕКТА, не PDF!')
    console.log('[checkDuplicateAndSaveProject] Проверка дубликатов перед сохранением проекта:', trimmedName)
    // Проверяем дубликаты перед сохранением проекта
    const duplicate = await checkDuplicateName(trimmedName, currentId)
    if (duplicate && duplicate.id !== currentId) {
      console.log('[checkDuplicateAndSaveProject] Найден дубликат, показываем модальное окно')
      setOverwriteModalProject(duplicate)
      setPendingSave(true)
      return
    }
    
    // Нет дубликатов - сохраняем только проект (без PDF) напрямую через persistProject
    console.log('[checkDuplicateAndSaveProject] Дубликатов не найдено, сохраняем проект напрямую')
    const savedProject = await persistProject(false, undefined)
    if (savedProject) {
      setCurrentProjectId(savedProject.id) // Обновляем ID сохранённого проекта
      setIsProjectSaved(true)
      setToast('Проект сохранён')
      setTimeout(() => setToast(null), 2000)
    } else {
      setToast('Ошибка: не удалось сохранить проект')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const saveProjectOnly = async (forceOverwrite = false, overwriteId?: string) => {
    try {
      console.log('[saveProjectOnly] Сохранение проекта вызвано, forceOverwrite:', forceOverwrite, 'overwriteId:', overwriteId)
      // Если forceOverwrite=true, сохраняем напрямую без проверки дубликатов
      // Иначе проверяем дубликаты через checkDuplicateAndSaveProject
      if (forceOverwrite) {
        console.log('[saveProjectOnly] Принудительное сохранение (без проверки дубликатов)')
        const savedProject = await persistProject(forceOverwrite, overwriteId)
        if (savedProject) {
          setCurrentProjectId(savedProject.id) // Обновляем ID сохранённого проекта
          setOverwriteModalProject(null)
          setPendingSave(false)
          setIsProjectSaved(true)
          setToast('Проект сохранён')
          setTimeout(() => setToast(null), 2000)
        } else {
          setToast('Ошибка: не удалось сохранить проект')
          setTimeout(() => setToast(null), 3000)
        }
      } else {
        console.log('[saveProjectOnly] Обычное сохранение (с проверкой дубликатов)')
        // Вызываем checkDuplicateAndSaveProject для проверки дубликатов
        await checkDuplicateAndSaveProject()
      }
    } catch (error: any) {
      console.error('[saveProjectOnly] Ошибка при сохранении проекта:', error)
      const errorMessage = error?.message || 'Ошибка сохранения проекта'
      setToast(errorMessage)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const savePdfOnly = async () => {
    try {
      // PDF сохраняется независимо от сохранения проекта
      // ВАЖНО: не вызываем проверку дубликатов и не сохраняем проект
      console.log('[savePdfOnly] Начало создания PDF (без сохранения проекта и без проверки дубликатов)...')
      console.log('[savePdfOnly] ЗАЩИТА: убеждаемся, что checkDuplicateAndSaveProject не вызывается')
      console.log('[savePdfOnly] ЗАЩИТА: убеждаемся, что saveProjectOnly не вызывается')
      console.log('[savePdfOnly] ЗАЩИТА: убеждаемся, что persistProject не вызывается')
      console.log('[savePdfOnly] ЗАЩИТА: убеждаемся, что checkDuplicateName не вызывается')
      setToast('Создание PDF...')
      
      const bytes = await makePdf()
      console.log('[savePdfOnly] PDF создан, размер:', bytes.length, 'байт')
      setToast('PDF создан, сохранение...')
      
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${projectName.trim() || 'Проект_строительства'}_${stamp}.pdf`
      console.log('[savePdfOnly] Имя файла:', filename)
      
      const { savePdfToDevice } = await import('@/lib/pdf/pdfStorage')
      console.log('[savePdfOnly] Сохранение PDF на устройство...')
      const result = await savePdfToDevice(filename, bytes)
      console.log('[savePdfOnly] Результат сохранения:', result)
      
      if (result) {
        // Обрабатываем как объект { uri, path } или как строку (для обратной совместимости)
        const uri = typeof result === 'string' ? result : result.uri
        
        // Освобождаем предыдущий URL, если он был (для веб-версии)
        if (savedPdfUri && savedPdfUri.startsWith('blob:')) {
          URL.revokeObjectURL(savedPdfUri)
        }
        setSavedPdfUri(uri)
        setToast('PDF сохранён успешно')
        setTimeout(() => setToast(null), 2000)
        console.log('PDF успешно сохранён, URI:', uri)
      } else {
        console.error('savePdfToDevice вернул null')
        setToast('Ошибка: не удалось сохранить PDF')
        setTimeout(() => setToast(null), 4000)
        if (typeof window !== 'undefined') {
          alert('Не удалось сохранить PDF. Проверьте логи в консоли для подробностей.')
        }
      }
    } catch (error: any) {
      console.error('Ошибка при сохранении PDF:', error)
      console.error('Стек ошибки:', error?.stack)
      const errorMessage = error?.message || 'Ошибка сохранения PDF. Приложение попробует сохранить файл в доступную директорию.'
      setToast(errorMessage)
      setTimeout(() => setToast(null), 4000)
      if (typeof window !== 'undefined') {
        alert(`Ошибка сохранения PDF: ${errorMessage}\n\nДетали: ${error?.stack || 'Нет деталей'}`)
      }
    }
  }

  const downloadPdf = async () => {
    console.log('[downloadPdf] Вызван: сохраняем проект и PDF')
    try {
      // Всегда сохраняем проект перед сохранением PDF
      console.log('[downloadPdf] Сохраняем проект перед сохранением PDF')
      await runUserInitiatedSave(async () => saveProjectOnly())
      
      // Затем сохраняем PDF
      await savePdfOnly()
      console.log('[downloadPdf] PDF и проект сохранены успешно')
    } catch (error: any) {
      console.error('[downloadPdf] Ошибка при сохранении:', error)
      setToast(error?.message || 'Ошибка при сохранении проекта или PDF')
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

  const handleBackClick = (e: React.MouseEvent) => {
    const href = mode === 'edit' ? '/dashboard' : '/projects/create'
    // Показываем окно только если:
    // 1. PDF не сохранён (значит проект тоже не сохранён через PDF)
    // 2. И проект не сохранён отдельно
    // Если PDF сохранён, значит проект уже сохранён, окно не показываем
    if (!savedPdfUri && !isProjectSaved && hasRequired) {
      e.preventDefault()
      setShowSaveBeforeExitModal(true)
      setPendingExit(() => () => router.push(href))
      return
    }
    router.push(href)
  }

  const handleSaveBeforeExit = async () => {
    setShowSaveBeforeExitModal(false)
    await runUserInitiatedSave(async () => saveProjectOnly())
    if (pendingExit) {
      pendingExit()
      setPendingExit(null)
    }
  }

  const handleExitWithoutSaving = () => {
    setShowSaveBeforeExitModal(false)
    // Удаляем проект только если он действительно не был сохранён
    // Если проект был сохранён (через "Сохранить PDF" или "Сохранить проект"), не удаляем его
    if (!isProjectSaved && !currentId) {
      // Если это создание нового проекта и проект не был сохранён — удаляем черновик
      const draftId = draftIdRef.current
      if (draftId) {
        try {
          deleteLocalProject(draftId)
        } catch {}
        try {
          void deleteDeviceProject(draftId)
        } catch {}
      }
    }
    // Если проект был сохранён (isProjectSaved === true или currentId существует), не удаляем его
    if (pendingExit) {
      pendingExit()
      setPendingExit(null)
    }
  }

  // Очищаем URL при размонтировании компонента (только для веб-версии)
  useEffect(() => {
    return () => {
      if (savedPdfUri && savedPdfUri.startsWith('blob:')) {
        URL.revokeObjectURL(savedPdfUri)
      }
    }
  }, [savedPdfUri])

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
    } catch (error: any) {
      console.error('Ошибка при открытии PDF:', error)
      setToast(error?.message || 'Не удалось открыть PDF')
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBackClick}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              ← Назад
            </button>
            <h1 className="text-2xl font-bold">Параметры стен</h1>
            <div className="w-[88px]" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-2 pb-10 sm:px-6">
        <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-5">
            <div>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Название проекта"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setIsMaterialOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
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
                      : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
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
                      : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  Снаружи
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* mini visualization */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 200 120" className="h-28 w-full max-w-md select-none rounded-xl border border-white/10 bg-black/40">
              <rect width="200" height="120" fill="transparent" />
              {(() => {
                const w = Number.isFinite(dims.width) && dims.width > 0 ? dims.width : 1
                const l = Number.isFinite(dims.length) && dims.length > 0 ? dims.length : 1
                const scale = 60 / Math.max(w, l, 1)
                const wPx = w * scale
                const lPx = l * scale
                const x0 = 10
                const y0 = 78
                const thickPx = 4
                const xV = x0 + wPx - thickPx
                const yV = y0 - lPx + thickPx
                const activeFill = '#3b82f6'
                const inactiveFill = 'rgba(255,255,255,0.20)'
                const activeStroke = '#2563eb'
                const inactiveStroke = 'rgba(255,255,255,0.25)'
                const widthLabel = `${format2(dims.width)}м`.replace('.', ',')
                const lengthLabel = `${format2(dims.length)}м`.replace('.', ',')
                return (
                  <>
                    <rect
                      x={x0}
                      y={y0}
                      width={wPx}
                      height={thickPx}
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
                    <rect
                      x={xV}
                      y={yV}
                      width={thickPx}
                      height={lPx}
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
                    <text x={x0 + wPx / 2} y={96} textAnchor="middle" fontSize={14} fontWeight={700} fill={activeWall === 1 ? '#60a5fa' : 'rgba(255,255,255,0.55)'}>
                      {widthLabel}
                    </text>
                    <text
                      x={xV + 18}
                      y={yV + lPx / 2}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activeWall === 2 ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${xV + 18} ${yV + lPx / 2})`}
                    >
                      {lengthLabel}
                    </text>
                  </>
                )
              })()}
            </svg>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-5">

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="text"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                  setWidthText(formatRu1(width))
                }}
              />
              <input
                type="text"
                inputMode="text"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                  setLengthText(formatRu1(length))
                }}
              />
              <input
                type="text"
                inputMode="text"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                inputMode="text"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          {openings.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {openings.map((o, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setOpenings((arr) => arr.filter((_, i) => i !== idx))}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-200 hover:bg-white/10"
                  title="Нажмите, чтобы удалить"
                >
                  ({formatRu1(o.width)}х{formatRu1(o.height)})
                  <span className="text-zinc-400">×</span>
                </button>
              ))}
            </div>
          )}

          {isAddingOpening ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">Новый проём</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  inputMode="text"
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-zinc-500"
                  placeholder="Ширина (м)"
                  value={openingWidthText}
                  onChange={(e) => setOpeningWidthText(sanitizeRuDecimalInput(e.target.value, 2))}
                  onBlur={() => {
                    if (openingWidthText.trim() === '') return
                    setOpeningWidthText(formatRu1(parseRuDecimal(openingWidthText)))
                  }}
                />
                <input
                  type="text"
                  inputMode="text"
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-zinc-500"
                  placeholder="Высота (м)"
                  value={openingHeightText}
                  onChange={(e) => setOpeningHeightText(sanitizeRuDecimalInput(e.target.value, 2))}
                  onBlur={() => {
                    if (openingHeightText.trim() === '') return
                    setOpeningHeightText(formatRu1(parseRuDecimal(openingHeightText)))
                  }}
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
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
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

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Примечание"
            className="relative w-full min-h-[120px] rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500/30 placeholder:opacity-50 focus:border-white/20 focus:outline-none"
            style={{
              resize: 'vertical',
            }}
          />
        </div>

        <div className="mt-3 rounded-2xl border border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-transparent p-6">
          <h3 className="text-lg font-semibold text-white">Результат расчёта</h3>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Принцип расчёта:</span>
              <span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-200">
                {principle === 'inside' ? 'Внутри' : 'Снаружи'}
              </span>
            </div>
            {!hasRequired || !results ? (
              <p className="mt-4 text-sm text-zinc-400">{missingHint}</p>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-zinc-400">Площадь</p>
                  <p className="mt-1 text-4xl font-bold text-white">
                    {results.area.toFixed(2)} <span className="text-2xl font-semibold">м²</span>
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-zinc-400">Объём</p>
                  <p className="mt-1 text-4xl font-bold text-white">
                    {results.volume.toFixed(2)} <span className="text-2xl font-semibold">м³</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <label className="col-span-2 flex items-center gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-500"
              checked={includePdfMeta}
              onChange={(e) => setIncludePdfMeta(e.target.checked)}
            />
            Добавить в PDF пользователя и почту
          </label>
          <button
            type="button"
            disabled={!hasRequired || !results}
            onClick={() => {
              if (savedPdfUri) {
                // Если PDF уже сохранён - открываем PDF
                openPdf().catch((e) => {
                  setToast(e?.message ?? 'Не удалось открыть PDF')
                  setTimeout(() => setToast(null), 2500)
                })
              } else {
                // Если PDF не сохранён - сохраняем PDF
                downloadPdf().catch((e) => {
                  setToast(e?.message ?? 'Не удалось сохранить PDF')
                  setTimeout(() => setToast(null), 2500)
                })
              }
            }}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-base font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-5 w-5" />
            {savedPdfUri ? 'Открыть PDF' : 'Сохранить в PDF'}
          </button>
          {(!hasRequired || !results) && (
            <p className="col-span-2 text-sm text-zinc-400">{missingHint}</p>
          )}
        </div>
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2">
          <div className="rounded-xl border border-white/10 bg-black/90 px-4 py-3 text-sm text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {isMaterialOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMaterialOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-auto rounded-t-2xl border-t border-white/10 bg-zinc-900 p-4">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-white">Выберите материал</p>
                <button
                  type="button"
                  onClick={() => setIsMaterialOpen(false)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15"
                >
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
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-left text-base text-white hover:bg-white/10"
                    >
                      <span>{m.label}</span>
                      <span
                        className={`h-5 w-5 rounded-full border ${
                          selected ? 'border-blue-400 bg-blue-500' : 'border-white/30 bg-transparent'
                        }`}
                      />
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
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
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
                className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-base font-semibold text-white hover:bg-black/60"
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

      {showSaveBeforeExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowSaveBeforeExitModal(false)}
          />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Сохранить проект?
            </h2>
            <p className="mb-6 text-base text-zinc-300">
              У вас есть несохранённые изменения. Хотите сохранить проект перед выходом?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleExitWithoutSaving}
                className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-base font-semibold text-white hover:bg-black/60"
              >
                Выйти без сохранения
              </button>
              <button
                type="button"
                onClick={handleSaveBeforeExit}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700"
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


