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
  return safeParse(window.localStorage.getItem(STORAGE_KEY))
}

function writeAll(projects: LocalProject[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  try {
    window.dispatchEvent(new CustomEvent('groxy:projects-changed'))
  } catch {}
}

export function listLocalProjects(): LocalProject[] {
  return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function getLocalProject(id: string): LocalProject | null {
  return readAll().find((p) => p.id === id) ?? null
}

export function upsertLocalProject(project: LocalProject) {
  const all = readAll()
  const idx = all.findIndex((p) => p.id === project.id)
  if (idx >= 0) all[idx] = project
  else all.unshift(project)
  writeAll(all)
}

export function deleteLocalProject(id: string) {
  writeAll(readAll().filter((p) => p.id !== id))
}

export function makeProjectId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}


