import type { SupabaseClient } from '@supabase/supabase-js'
import type { LocalProject } from './localProjects'
import { PROJECTS_LIMIT } from './projectsLimit'

const TABLE = 'user_projects'

/** Проверка, что id похож на uuid (проект из Supabase). */
export function isSupabaseProjectId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function rowToProject(row: {
  id: string
  name: string
  type: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}): LocalProject {
  const p = row.payload as Record<string, unknown>
  const base = {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    type: row.type as 'walls_2' | 'walls_3' | 'walls_4',
    data: p.data as LocalProject['data'],
    pdfFilename: p.pdfFilename as string | undefined,
    pdfComment: p.pdfComment as string | undefined,
    notes: p.notes as string | undefined,
    foundation: p.foundation as LocalProject['foundation'],
    roof: p.roof as LocalProject['roof'],
    resultsOverrides: p.resultsOverrides as LocalProject['resultsOverrides'],
  }
  return base as LocalProject
}

export async function listSupabaseProjects(supabase: SupabaseClient): Promise<LocalProject[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, type, payload, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToProject)
}

export async function getSupabaseProject(supabase: SupabaseClient, id: string): Promise<LocalProject | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, type, payload, created_at, updated_at')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return rowToProject(data)
}

/** Сохранить проект в Supabase (insert или update). Возвращает проект с актуальным id. */
export async function saveProjectToSupabase(
  supabase: SupabaseClient,
  project: LocalProject
): Promise<LocalProject | null> {
  const userId = (await supabase.auth.getUser()).data?.user?.id
  if (!userId) return null

  const payload = {
    name: project.name,
    type: project.type,
    data: project.data,
    pdfFilename: project.pdfFilename,
    pdfComment: project.pdfComment,
    notes: project.notes,
    foundation: project.foundation,
    roof: project.roof,
    resultsOverrides: project.resultsOverrides,
  }

  if (isSupabaseProjectId(project.id)) {
    const { error } = await supabase
      .from(TABLE)
      .update({
        name: project.name,
        type: project.type,
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
      .eq('user_id', userId)
    if (error) throw error
    return { ...project, updatedAt: new Date().toISOString() }
  }

  const existingList = await listSupabaseProjects(supabase)
  if (existingList.length >= PROJECTS_LIMIT) return null

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      name: project.name,
      type: project.type,
      payload,
    })
    .select('id, name, type, payload, created_at, updated_at')
    .single()
  if (error) throw error
  return data ? rowToProject(data) : null
}

export async function deleteSupabaseProject(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from(TABLE).delete().eq('id', id)
}
