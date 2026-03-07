import type { LocalProject } from './localProjects'

async function isNative() {
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function saveProjectToDevice(project: LocalProject) {
  if (!(await isNative())) return
  
  // Жёсткая защита: запрещаем любые автоматические сохранения на устройство.
  // Разрешаем только когда UI явно поднял флаг (например "Сохранить", "Сохранить и выйти", "Перезаписать").
  const allow = (window as Window & { __GROXY_ALLOW_DEVICE_PROJECT_SAVE__?: boolean }).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ === true
  if (!allow) {
    console.warn('saveProjectToDevice: BLOCKED (no explicit user consent)')
    return
  }

  // На Android используем JavaScript Interface
  try {
    const nativeStorage = (window as Window & { NativeStorage?: { saveProject: (json: string) => string; setAllowProjectSave?: (v: boolean) => void } }).NativeStorage
    if (!nativeStorage || typeof nativeStorage.saveProject !== 'function') {
      console.warn('NativeStorage.saveProject не доступен')
      return
    }

    // Доп. защита на native-уровне (если доступно)
    if (typeof nativeStorage.setAllowProjectSave === 'function') {
      try {
        nativeStorage.setAllowProjectSave(true)
      } catch {}
    }
    
    const resultStr = nativeStorage.saveProject(JSON.stringify(project))
    const result = JSON.parse(resultStr)
    if (result.error) {
      console.error('Ошибка сохранения проекта на устройство:', result.error)
    }
    try {
      window.dispatchEvent(new CustomEvent('groxy:projects-changed'))
    } catch {}
  } catch (error) {
    console.error('Ошибка сохранения проекта на устройство:', error)
  } finally {
    try {
      const nativeStorage = (window as Window & { NativeStorage?: { saveProject: (json: string) => string; setAllowProjectSave?: (v: boolean) => void } }).NativeStorage
      if (nativeStorage && typeof nativeStorage.setAllowProjectSave === 'function') {
        nativeStorage.setAllowProjectSave(false)
      }
    } catch {}
  }
}

export async function listDeviceProjects(): Promise<LocalProject[]> {
  if (!(await isNative())) return []
  
  const isValidProject = (p: unknown): p is LocalProject => {
    if (!p || typeof p !== 'object') return false
    const o = p as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id) return false
    if (typeof o.name !== 'string' || !o.name) return false
    if (o.type !== 'walls_2' && o.type !== 'walls_3' && o.type !== 'walls_4') return false
    if (!o.data || typeof o.data !== 'object') return false

    const d = o.data as Record<string, unknown>
    const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

    if (o.type === 'walls_2') {
      return isNum(d.width) && isNum(d.length) && isNum(d.height) && isNum(d.thickness)
    }
    if (o.type === 'walls_3') {
      return isNum(d.left) && isNum(d.back) && isNum(d.right) && isNum(d.height) && isNum(d.thickness)
    }
    // walls_4
    return isNum(d.width) && isNum(d.length) && isNum(d.height) && isNum(d.thickness)
  }

  // На Android используем JavaScript Interface
  try {
    const nativeStorage = (window as Window & { NativeStorage?: { listProjects: () => string } }).NativeStorage
    if (!nativeStorage || typeof nativeStorage.listProjects !== 'function') {
      console.warn('NativeStorage.listProjects не доступен')
      return []
    }
    
    const projectsStr = nativeStorage.listProjects()
    const projects = JSON.parse(projectsStr) as LocalProject[]
    
    // Фильтруем только валидные проекты
    return projects
      .filter((p: unknown) => isValidProject(p))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  } catch (error) {
    console.error('Ошибка загрузки проектов с устройства:', error)
    return []
  }
}

export async function deleteDeviceProject(id: string) {
  if (!(await isNative())) return
  
  // На Android используем JavaScript Interface
  try {
    const nativeStorage = (window as Window & { NativeStorage?: { deleteProject: (id: string) => void } }).NativeStorage
    if (!nativeStorage || typeof nativeStorage.deleteProject !== 'function') {
      console.warn('NativeStorage.deleteProject не доступен')
      return
    }
    
    nativeStorage.deleteProject(id)
    try {
      window.dispatchEvent(new CustomEvent('groxy:projects-changed'))
    } catch {}
  } catch (error) {
    console.error('Ошибка удаления проекта с устройства:', error)
  }
}

export async function exportAllLocalProjectsToDevice(projects: LocalProject[]) {
  if (!(await isNative())) return
  for (const p of projects) {
    await saveProjectToDevice(p)
  }
}


