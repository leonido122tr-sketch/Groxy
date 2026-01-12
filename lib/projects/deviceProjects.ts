import type { LocalProject } from './localProjects'

const GROXY_DIR = 'Groxy'
const PROJECTS_DIR = `${GROXY_DIR}/projects`

async function isNative() {
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function saveProjectToDevice(project: LocalProject) {
  if (!(await isNative())) return
  
  // Жёсткая защита: запрещаем любые автоматические сохранения на устройство.
  // Разрешаем только когда UI явно поднял флаг (например "Сохранить", "Сохранить и выйти", "Перезаписать").
  const allow = (window as any).__GROXY_ALLOW_DEVICE_PROJECT_SAVE__ === true
  if (!allow) {
    console.warn('saveProjectToDevice: BLOCKED (no explicit user consent)')
    return
  }

  // На Android используем JavaScript Interface
  try {
    const nativeStorage = (window as any).NativeStorage
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
      const nativeStorage = (window as any).NativeStorage
      if (nativeStorage && typeof nativeStorage.setAllowProjectSave === 'function') {
        nativeStorage.setAllowProjectSave(false)
      }
    } catch {}
  }
}

export async function listDeviceProjects(): Promise<LocalProject[]> {
  if (!(await isNative())) return []
  
  const isValidProject = (p: any): p is LocalProject => {
    if (!p || typeof p !== 'object') return false
    if (typeof p.id !== 'string' || !p.id) return false
    if (typeof p.name !== 'string' || !p.name) return false
    if (p.type !== 'walls_2' && p.type !== 'walls_3' && p.type !== 'walls_4') return false
    if (!p.data || typeof p.data !== 'object') return false

    const d = p.data as any
    const isNum = (v: any) => typeof v === 'number' && Number.isFinite(v)

    if (p.type === 'walls_2') {
      return isNum(d.width) && isNum(d.length) && isNum(d.height) && isNum(d.thickness)
    }
    if (p.type === 'walls_3') {
      return isNum(d.left) && isNum(d.back) && isNum(d.right) && isNum(d.height) && isNum(d.thickness)
    }
    // walls_4
    return isNum(d.width) && isNum(d.length) && isNum(d.height) && isNum(d.thickness)
  }

  // На Android используем JavaScript Interface
  try {
    const nativeStorage = (window as any).NativeStorage
    if (!nativeStorage || typeof nativeStorage.listProjects !== 'function') {
      console.warn('NativeStorage.listProjects не доступен')
      return []
    }
    
    const projectsStr = nativeStorage.listProjects()
    const projects = JSON.parse(projectsStr) as LocalProject[]
    
    // Фильтруем только валидные проекты
    return projects
      .filter((p: any) => isValidProject(p))
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
    const nativeStorage = (window as any).NativeStorage
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


