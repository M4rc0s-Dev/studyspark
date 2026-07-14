import { supabase } from './supabase'

export interface FolderRow {
  id: string
  user_id: string
  path: string
  color: string | null
  created_at: string
}

// Load every empty (no-session) folder path for the current user from Supabase.
// Failures are swallowed so the local experience never breaks.
export async function loadFoldersFromSupabase(): Promise<string[]> {
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('folders')
    .select('path')
    .eq('user_id', user.id)
  if (error || !data) return []
  return (data as Pick<FolderRow, 'path'>[]).map((r) => r.path)
}

// Upsert a set of folder paths for the current user. We reconcile by deleting
// the paths that are no longer present and inserting the new ones, keeping the
// cloud list exactly in sync with what the UI shows.
export async function syncFoldersToSupabase(paths: string[]): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Read existing so we only touch what changed (cheaper + avoids unique races).
  const { data: existing } = await supabase
    .from('folders')
    .select('path')
    .eq('user_id', user.id)
  const existingPaths = new Set((existing as Pick<FolderRow, 'path'>[] | null)?.map((r) => r.path) ?? [])

  const toInsert = paths.filter((p) => !existingPaths.has(p))
  const toDelete = [...existingPaths].filter((p) => !paths.includes(p))

  if (toDelete.length) {
    await supabase.from('folders').delete().eq('user_id', user.id).in('path', toDelete)
  }
  if (toInsert.length) {
    await supabase
      .from('folders')
      .upsert(toInsert.map((path) => ({ user_id: user.id, path })), { onConflict: 'user_id,path' })
  }
}
