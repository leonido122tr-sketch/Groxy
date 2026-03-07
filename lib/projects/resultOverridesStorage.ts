import type { ResultsOverrides } from './localProjects'

const FOUNDATION_KEYS = {
  '2': 'resultsOverride_foundation_2',
  '3': 'resultsOverride_foundation_3',
  '4': 'resultsOverride_foundation_4',
} as const

const ROOF_KEYS = {
  '2': 'resultsOverride_roof_2',
  '3': 'resultsOverride_roof_3',
  '4': 'resultsOverride_roof_4',
} as const

const WALLS_KEYS = {
  '2': 'resultsOverride_walls_2',
  '3': 'resultsOverride_walls_3',
  '4': 'resultsOverride_walls_4',
} as const

export type WallsVariant = '2' | '3' | '4'

/**
 * Читает из sessionStorage переопределения фундамента для варианта 2/3/4.
 * Для варианта 2 может быть JSON { foundationVolume, foundationReinforcement, foundationHoops } или число (объём, legacy).
 */
export function getFoundationOverridesFromStorage(variant: WallsVariant): Pick<ResultsOverrides, 'foundationVolume' | 'foundationReinforcement' | 'foundationHoops'> {
  const empty = { foundationVolume: undefined, foundationReinforcement: undefined, foundationHoops: undefined }
  if (typeof window === 'undefined') return empty
  const raw = sessionStorage.getItem(FOUNDATION_KEYS[variant])
  if (raw == null || raw === '') return empty
  if (variant === '2' || variant === '3' || variant === '4') {
    try {
      const parsed = JSON.parse(raw) as { foundationVolume?: number; foundationReinforcement?: number; foundationHoops?: number }
      return {
        foundationVolume: typeof parsed.foundationVolume === 'number' && Number.isFinite(parsed.foundationVolume) && parsed.foundationVolume >= 0 ? parsed.foundationVolume : undefined,
        foundationReinforcement: typeof parsed.foundationReinforcement === 'number' && Number.isFinite(parsed.foundationReinforcement) && parsed.foundationReinforcement >= 0 ? parsed.foundationReinforcement : undefined,
        foundationHoops: typeof parsed.foundationHoops === 'number' && Number.isFinite(parsed.foundationHoops) && parsed.foundationHoops >= 0 ? parsed.foundationHoops : undefined,
      }
    } catch {
      const v = Number.parseFloat(raw)
      return { foundationVolume: Number.isFinite(v) && v >= 0 ? v : undefined, foundationReinforcement: undefined, foundationHoops: undefined }
    }
  }
  const v = Number.parseFloat(raw)
  return { foundationVolume: Number.isFinite(v) && v >= 0 ? v : undefined, foundationReinforcement: undefined, foundationHoops: undefined }
}

/**
 * Записывает переопределения фундамента в sessionStorage. Для вариантов 2/3/4 — JSON (объём, арматура, хомуты).
 */
export function setFoundationOverridesInStorage(variant: WallsVariant, overrides: Partial<Pick<ResultsOverrides, 'foundationVolume' | 'foundationReinforcement' | 'foundationHoops'>>): void {
  if (typeof window === 'undefined') return
  const key = FOUNDATION_KEYS[variant]
  if (variant === '2' || variant === '3' || variant === '4') {
    const current = getFoundationOverridesFromStorage(variant)
    const next = {
      foundationVolume: Object.prototype.hasOwnProperty.call(overrides, 'foundationVolume') ? overrides.foundationVolume : current.foundationVolume,
      foundationReinforcement: Object.prototype.hasOwnProperty.call(overrides, 'foundationReinforcement') ? overrides.foundationReinforcement : current.foundationReinforcement,
      foundationHoops: Object.prototype.hasOwnProperty.call(overrides, 'foundationHoops') ? overrides.foundationHoops : current.foundationHoops,
    }
    const hasAny = next.foundationVolume != null || next.foundationReinforcement != null || next.foundationHoops != null
    if (hasAny) {
      sessionStorage.setItem(key, JSON.stringify(next))
    } else {
      sessionStorage.removeItem(key)
    }
    return
  }
  if (overrides.foundationVolume != null) {
    sessionStorage.setItem(key, String(overrides.foundationVolume))
  } else {
    sessionStorage.removeItem(key)
  }
}

/**
 * Читает из sessionStorage переопределения площади и объёма стен для варианта 2/3/4.
 */
export function getWallsOverridesFromStorage(variant: WallsVariant): Pick<ResultsOverrides, 'wallsArea' | 'wallsVolume'> {
  const empty = { wallsArea: undefined, wallsVolume: undefined }
  if (typeof window === 'undefined') return empty
  const raw = sessionStorage.getItem(WALLS_KEYS[variant])
  if (raw == null || raw === '') return empty
  try {
    const parsed = JSON.parse(raw) as { wallsArea?: number | null; wallsVolume?: number | null }
    const wallsArea = typeof parsed.wallsArea === 'number' && Number.isFinite(parsed.wallsArea) && parsed.wallsArea >= 0 ? parsed.wallsArea : undefined
    const wallsVolume = typeof parsed.wallsVolume === 'number' && Number.isFinite(parsed.wallsVolume) && parsed.wallsVolume >= 0 ? parsed.wallsVolume : undefined
    return { wallsArea, wallsVolume }
  } catch {
    return empty
  }
}

/**
 * Записывает переопределения стен в sessionStorage для варианта 2/3/4.
 */
export function setWallsOverridesInStorage(variant: WallsVariant, overrides: Partial<Pick<ResultsOverrides, 'wallsArea' | 'wallsVolume'>>): void {
  if (typeof window === 'undefined') return
  const key = WALLS_KEYS[variant]
  const current = getWallsOverridesFromStorage(variant)
  const wallsArea = Object.prototype.hasOwnProperty.call(overrides, 'wallsArea') ? overrides.wallsArea : current.wallsArea
  const wallsVolume = Object.prototype.hasOwnProperty.call(overrides, 'wallsVolume') ? overrides.wallsVolume : current.wallsVolume
  if (wallsArea == null && wallsVolume == null) {
    sessionStorage.removeItem(key)
    return
  }
  sessionStorage.setItem(key, JSON.stringify({ wallsArea: wallsArea ?? null, wallsVolume: wallsVolume ?? null }))
}

export type RoofOverrides2 = Pick<ResultsOverrides, 'roofArea' | 'roofRaftersVolume' | 'roofPurlinVolume' | 'roofBattenVolume'>

/**
 * Читает переопределения крыши из sessionStorage. Для варианта 2 — JSON (площадь, стропила, прогоны, обрешётка).
 */
export function getRoofOverridesFromStorage(variant: WallsVariant): Partial<RoofOverrides2> {
  const empty: Partial<RoofOverrides2> = {}
  if (typeof window === 'undefined') return empty
  const raw = sessionStorage.getItem(ROOF_KEYS[variant])
  if (raw == null || raw === '') return empty
  if (variant === '2' || variant === '3' || variant === '4') {
    try {
      const parsed = JSON.parse(raw) as { roofArea?: number; roofRaftersVolume?: number; roofPurlinVolume?: number; roofBattenVolume?: number }
      const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined
      return {
        roofArea: num(parsed.roofArea),
        roofRaftersVolume: num(parsed.roofRaftersVolume),
        roofPurlinVolume: num(parsed.roofPurlinVolume),
        roofBattenVolume: num(parsed.roofBattenVolume),
      }
    } catch {
      const v = Number.parseFloat(raw)
      return Number.isFinite(v) && v >= 0 ? { roofArea: v } : empty
    }
  }
  const v = Number.parseFloat(raw)
  return Number.isFinite(v) && v >= 0 ? { roofArea: v } : empty
}

/**
 * Записывает переопределения крыши в sessionStorage. Для варианта 2 — JSON (площадь, стропила, прогоны, обрешётка).
 */
export function setRoofOverridesInStorage(variant: WallsVariant, overrides: Partial<RoofOverrides2>): void {
  if (typeof window === 'undefined') return
  const key = ROOF_KEYS[variant]
  if (variant === '2' || variant === '3' || variant === '4') {
    const current = getRoofOverridesFromStorage(variant)
    const next: RoofOverrides2 = {
      roofArea: Object.prototype.hasOwnProperty.call(overrides, 'roofArea') ? overrides.roofArea : current.roofArea,
      roofRaftersVolume: Object.prototype.hasOwnProperty.call(overrides, 'roofRaftersVolume') ? overrides.roofRaftersVolume : current.roofRaftersVolume,
      roofPurlinVolume: Object.prototype.hasOwnProperty.call(overrides, 'roofPurlinVolume') ? overrides.roofPurlinVolume : current.roofPurlinVolume,
      roofBattenVolume: Object.prototype.hasOwnProperty.call(overrides, 'roofBattenVolume') ? overrides.roofBattenVolume : current.roofBattenVolume,
    }
    const hasAny = next.roofArea != null || next.roofRaftersVolume != null || next.roofPurlinVolume != null || next.roofBattenVolume != null
    if (hasAny) {
      sessionStorage.setItem(key, JSON.stringify(next))
    } else {
      sessionStorage.removeItem(key)
    }
    return
  }
  if (overrides.roofArea != null) {
    sessionStorage.setItem(key, String(overrides.roofArea))
  } else {
    sessionStorage.removeItem(key)
  }
}

/**
 * Читает из sessionStorage переопределения фундамента и площади крыши
 * для текущего типа проекта (2/3/4 стены). Используется при сохранении и генерации PDF.
 */
export function getFoundationRoofOverridesFromStorage(variant: WallsVariant): Partial<ResultsOverrides> {
  if (typeof window === 'undefined') return {}
  const out: Partial<ResultsOverrides> = {}
  const fOverrides = getFoundationOverridesFromStorage(variant)
  if (fOverrides.foundationVolume != null) out.foundationVolume = fOverrides.foundationVolume
  if (fOverrides.foundationReinforcement != null) out.foundationReinforcement = fOverrides.foundationReinforcement
  if (fOverrides.foundationHoops != null) out.foundationHoops = fOverrides.foundationHoops
  const rOverrides = getRoofOverridesFromStorage(variant)
  if (rOverrides.roofArea != null) out.roofArea = rOverrides.roofArea
  if (rOverrides.roofRaftersVolume != null) out.roofRaftersVolume = rOverrides.roofRaftersVolume
  if (rOverrides.roofPurlinVolume != null) out.roofPurlinVolume = rOverrides.roofPurlinVolume
  if (rOverrides.roofBattenVolume != null) out.roofBattenVolume = rOverrides.roofBattenVolume
  return out
}

/**
 * Очищает переопределения итогов для одного варианта (2/3/4 стены).
 * Вызывать при открытии проекта без сохранённых переопределений, чтобы не подставлять старые значения из сессии.
 */
export function clearResultOverridesForVariant(variant: WallsVariant): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(FOUNDATION_KEYS[variant])
  sessionStorage.removeItem(ROOF_KEYS[variant])
  sessionStorage.removeItem(WALLS_KEYS[variant])
}

/**
 * Очищает все переопределения итогов в sessionStorage.
 * Вызывать при входе на список проектов, чтобы при выходе из проекта без сохранения
 * изменённые результаты не «переезжали» в следующий проект.
 */
export function clearResultOverridesFromStorage(): void {
  if (typeof window === 'undefined') return
  ;(Object.values(FOUNDATION_KEYS) as string[]).forEach((key) => sessionStorage.removeItem(key))
  ;(Object.values(ROOF_KEYS) as string[]).forEach((key) => sessionStorage.removeItem(key))
  ;(Object.values(WALLS_KEYS) as string[]).forEach((key) => sessionStorage.removeItem(key))
}
