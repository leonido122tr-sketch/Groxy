import { PROJECTS_LIMIT } from './projectsLimit'

export type Principle = 'inside' | 'outside'

export type Opening = {
  /** 1|2 для 2 стен; 1=левая, 2=задняя, 3=правая для 3 стен; 1–4 для 4 стен (по кругу) */
  wall?: 1 | 2 | 3 | 4
  width: number
  height: number
  /** Position along wall in meters from start (for plan visualization) */
  offset?: number
}

export type Walls2ProjectData = {
  principle: Principle
  material: string
  width: number
  length: number
  height: number
  thickness: number
  openings: Opening[]
  note?: string
}

export type Walls3ProjectData = {
  principle: Principle
  material: string
  left: number
  back: number
  right: number
  height: number
  thickness: number
  openings: Opening[]
  note?: string
}

export type Walls4ProjectData = {
  principle: Principle
  material: string
  width: number
  length: number
  height: number
  thickness: number
  openings: Opening[]
  note?: string
}

/** Данные фундамента (как в sessionStorage): для 2/4 стен — length, width; для 3 стен — left, back, right; общие — height, thickness, principle, concreteGrade? */
export type FoundationData = Record<string, unknown>

/** Данные крыши при сохранении: для 2 стен — width, length; для 3 стен — left, back, right; общие — height, overhang */
export type RoofData = Record<string, unknown>

/**
 * В приложении «проект» — это полный набор данных, а не только стены:
 * - фундамент (foundation)
 * - стены (data: параметры стен и проёмы)
 * - крыша (roof)
 * - комментарий в PDF (pdfComment) и заметки (notes)
 * Сохранение, «есть изменения» (dirty), кнопка дискеты должны учитывать изменения в любой из этих частей.
 */

/** Переопределения итоговых расчётов, введённые пользователем вручную */
export type ResultsOverrides = {
  wallsArea?: number
  wallsVolume?: number
  foundationVolume?: number
  foundationReinforcement?: number
  foundationHoops?: number
  roofArea?: number
  roofRaftersVolume?: number
  roofPurlinVolume?: number
  roofBattenVolume?: number
}

export type LocalProject =
  | {
      id: string
      name: string
      createdAt: string
      updatedAt: string
      type: 'walls_2'
      data: Walls2ProjectData
      pdfFilename?: string
      platform?: 'android' | 'web'
      pdfComment?: string
      notes?: string
      foundation?: FoundationData
      roof?: RoofData
      resultsOverrides?: ResultsOverrides
    }
  | {
      id: string
      name: string
      createdAt: string
      updatedAt: string
      type: 'walls_3'
      data: Walls3ProjectData
      pdfFilename?: string
      platform?: 'android' | 'web'
      pdfComment?: string
      notes?: string
      foundation?: FoundationData
      roof?: RoofData
      resultsOverrides?: ResultsOverrides
    }
  | {
      id: string
      name: string
      createdAt: string
      updatedAt: string
      type: 'walls_4'
      data: Walls4ProjectData
      pdfFilename?: string
      platform?: 'android' | 'web'
      pdfComment?: string
      notes?: string
      foundation?: FoundationData
      roof?: RoofData
      resultsOverrides?: ResultsOverrides
    }

// Backwards compatibility for earlier stored shape
export type LegacyLocalProject = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  type: 'walls_2' | 'walls_3' | 'walls_4'
  data: Record<string, unknown>
}

const STORAGE_KEY = 'groxy.projects.v1'
const LIST_SNAPSHOT_KEY = 'groxy.projects.snapshot.v1'
const CACHE_OWNER_KEY = 'groxy.cacheOwner'
const DEVICE_CLAIM_KEY = 'groxy.deviceProjectsOwner'

function userStorageKey(userId: string) {
  return `${STORAGE_KEY}.${userId}`
}

function userSnapshotKey(userId: string) {
  return `${LIST_SNAPSHOT_KEY}.${userId}`
}

export function getProjectCacheOwner(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CACHE_OWNER_KEY)
}

function moveLegacyProjects(userId: string) {
  const legacy = window.localStorage.getItem(STORAGE_KEY)
  if (!legacy) return
  const dest = userStorageKey(userId)
  if (!window.localStorage.getItem(dest)) {
    window.localStorage.setItem(dest, legacy)
  }
  window.localStorage.removeItem(STORAGE_KEY)
}

/** Привязать уже сохранённые на телефоне проекты к вошедшему аккаунту. */
export function rememberProjectCacheOwner(userId: string) {
  if (typeof window === 'undefined' || !userId) return
  const previous = window.localStorage.getItem(CACHE_OWNER_KEY)
  if (previous && previous !== userId) {
    moveLegacyProjects(previous)
  } else if (!previous) {
    moveLegacyProjects(userId)
  }
  if (!window.localStorage.getItem(DEVICE_CLAIM_KEY)) {
    window.localStorage.setItem(DEVICE_CLAIM_KEY, userId)
  }
  window.localStorage.setItem(CACHE_OWNER_KEY, userId)
  window.localStorage.removeItem(LIST_SNAPSHOT_KEY)
}

/** Перед выходом убрать общий список, чтобы следующий аккаунт его не увидел. */
export function sealProjectCache(userId: string | null) {
  if (typeof window === 'undefined') return
  if (userId) {
    moveLegacyProjects(userId)
    if (!window.localStorage.getItem(DEVICE_CLAIM_KEY)) {
      window.localStorage.setItem(DEVICE_CLAIM_KEY, userId)
    }
  }
  window.localStorage.removeItem(LIST_SNAPSHOT_KEY)
  window.localStorage.removeItem(CACHE_OWNER_KEY)
}

export function deviceProjectVisible(ownerId: string | undefined): boolean {
  if (typeof window === 'undefined') return false
  const current = window.localStorage.getItem(CACHE_OWNER_KEY)
  if (!current) return false
  if (ownerId) return ownerId === current
  const claim = window.localStorage.getItem(DEVICE_CLAIM_KEY)
  if (!claim) return true
  return claim === current
}

function normalizeProject(p: unknown): LocalProject | null {
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  if (!o.id || !o.name || !o.type || !o.data) return null
  if (o.type === 'walls_2') {
    const d = o.data as Record<string, unknown>
    if (typeof d?.width !== 'number' || typeof d?.length !== 'number') return null
    return o as unknown as LocalProject
  }
  if (o.type === 'walls_3') {
    const d = o.data as Record<string, unknown>
    if (typeof d?.left !== 'number' || typeof d?.back !== 'number' || typeof d?.right !== 'number') return null
    return o as unknown as LocalProject
  }
  if (o.type === 'walls_4') {
    const d = o.data as Record<string, unknown>
    if (typeof d?.width !== 'number' || typeof d?.length !== 'number') return null
    return o as unknown as LocalProject
  }
  return null
}

function safeParse(json: string | null): LocalProject[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    if (!Array.isArray(v)) return []
    const out: LocalProject[] = []
    for (const item of v) {
      const norm = normalizeProject(item)
      if (norm) out.push(norm)
    }
    return out
  } catch {
    return []
  }
}

function readAll(): LocalProject[] {
  if (typeof window === 'undefined') return []
  const owner = getProjectCacheOwner()
  if (!owner) return []
  return safeParse(window.localStorage.getItem(userStorageKey(owner)))
}

function writeAll(projects: LocalProject[]) {
  if (typeof window === 'undefined') return
  const owner = getProjectCacheOwner()
  if (!owner) return
  window.localStorage.setItem(userStorageKey(owner), JSON.stringify(projects))
  try {
    window.dispatchEvent(new CustomEvent('groxy:projects-changed'))
  } catch {}
}

export function listLocalProjects(): LocalProject[] {
  return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

/** Последний показанный список «Мои проекты»: чтобы экран открылся до ответа сервера. */
export function readProjectListSnapshot(): LocalProject[] {
  if (typeof window === 'undefined') return []
  const owner = getProjectCacheOwner()
  if (!owner) return []
  return safeParse(window.localStorage.getItem(userSnapshotKey(owner)))
}

export function writeProjectListSnapshot(projects: LocalProject[]) {
  if (typeof window === 'undefined') return
  const owner = getProjectCacheOwner()
  if (!owner) return
  try {
    window.localStorage.setItem(userSnapshotKey(owner), JSON.stringify(projects))
    window.localStorage.removeItem(LIST_SNAPSHOT_KEY)
  } catch {
    // Память браузера переполнена — список всё равно останется на экране в этой сессии.
  }
}

export function getLocalProject(id: string): LocalProject | null {
  return readAll().find((p) => p.id === id) ?? null
}

export function upsertLocalProject(project: LocalProject) {
  const all = readAll()
  const idx = all.findIndex((p) => p.id === project.id)
  if (idx >= 0) {
    all[idx] = project
  } else {
    if (all.length >= PROJECTS_LIMIT) return
    all.unshift(project)
  }
  writeAll(all)
}

export function deleteLocalProject(id: string) {
  writeAll(readAll().filter((p) => p.id !== id))
}

export function makeProjectId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}


