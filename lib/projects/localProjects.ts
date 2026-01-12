export type Principle = 'inside' | 'outside'

export type Opening = {
  // legacy: wall could exist in older saves; we don't use it now
  wall?: 1 | 2
  width: number
  height: number
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

export type LocalProject =
  | {
      id: string
      name: string
      createdAt: string
      updatedAt: string
      type: 'walls_2'
      data: Walls2ProjectData
      platform?: 'android' | 'web'
    }
  | {
      id: string
      name: string
      createdAt: string
      updatedAt: string
      type: 'walls_3'
      data: Walls3ProjectData
      platform?: 'android' | 'web'
    }
  | {
      id: string
      name: string
      createdAt: string
      updatedAt: string
      type: 'walls_4'
      data: Walls4ProjectData
      platform?: 'android' | 'web'
    }

// Backwards compatibility for earlier stored shape
export type LegacyLocalProject = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  type: 'walls_2' | 'walls_3' | 'walls_4'
  data: any
}

const STORAGE_KEY = 'groxy.projects.v1'

function normalizeProject(p: any): LocalProject | null {
  if (!p?.id || !p?.name || !p?.type || !p?.data) return null
  if (p.type === 'walls_2') {
    const d = p.data
    if (typeof d?.width !== 'number' || typeof d?.length !== 'number') return null
    return p as LocalProject
  }
  if (p.type === 'walls_3') {
    const d = p.data
    if (typeof d?.left !== 'number' || typeof d?.back !== 'number' || typeof d?.right !== 'number') return null
    return p as LocalProject
  }
  if (p.type === 'walls_4') {
    const d = p.data
    if (
      typeof d?.width !== 'number' ||
      typeof d?.length !== 'number'
    )
      return null
    return p as LocalProject
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


