import { createClient } from '@/lib/supabase/client'
import { sealProjectCache } from '@/lib/projects/localProjects'

export async function deleteOwnAccount(): Promise<void> {
  const supabase = createClient()
  const { data, error: userError } = await supabase.auth.getUser()
  const userId = data.user?.id ?? null
  if (userError || !userId) {
    throw new Error('Войдите в аккаунт, чтобы удалить его.')
  }

  const { error } = await supabase.rpc('delete_own_account')
  if (error) {
    throw new Error('Не удалось удалить аккаунт. Напишите в раздел «Поддержка и сотрудничество».')
  }

  sealProjectCache(userId)
  await supabase.auth.signOut().catch(() => {})
}
