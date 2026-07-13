import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Only construct the client when the env vars are present. Building without
// them (e.g. on a host that doesn't inject VITE_ vars) would otherwise throw
// at module load and blank the whole app.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Auth and saving are disabled until they are provided at build time.'
  )
}

export interface Profile {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
  is_premium: boolean
  xp: number
  study_streak: number
  last_study_date: string | null
  created_at: string
}

export interface SessionRow {
  id: string
  user_id: string
  title: string
  study_mode: string
  flashcards: unknown[]
  time_spent: number
  score: number
  folder: string
  color: string | null
  created_at: string
}
