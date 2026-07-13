import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
import { SessionRow } from '../lib/supabase'
import { randomAvatarSeed } from '../lib/avatars'

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  sessions: SessionRow[]
  loading: boolean
  signUp: (email: string, password: string, name?: string, avatar?: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSessions: () => Promise<void>
  addXp: (amount: number) => Promise<void>
  updateAvatar: (avatar: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// The auth session is the source of truth (it always has id + email).
// `profiles` is only an optional complement, so a missing/deleted profile
// must NEVER hide the signed-in account.
function toAuthUser(user: User, profile: Profile | null): AuthUser {
  const meta = (user.user_metadata || {}) as { name?: string }
  const name = profile?.name || meta.name || (user.email ? user.email.split('@')[0] : '') || 'Usuario'
  return {
    id: user.id,
    email: user.email || profile?.email || '',
    name,
  }
}

// If a profile row is missing (e.g. it was deleted), recreate it on login so
// the user never loses their account link. Uses the owner-only insert policy.
// `avatar` (optional) is only set when creating a fresh profile; an existing
// one keeps whatever avatar it already has (we never overwrite on the server).
async function ensureProfile(user: User, avatar?: string): Promise<Profile | null> {
  if (!supabase) return null
  const meta = (user.user_metadata || {}) as { name?: string }
  const seed = avatar || (user.user_metadata?.avatar as string) || randomAvatarSeed()
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email ?? '', name: meta.name ?? '', avatar: seed },
      { onConflict: 'id' },
    )
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return data as Profile
}

async function fetchSessions(userId: string): Promise<SessionRow[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as SessionRow[]) || []
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u: User) => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()
    if (!error && data) {
      setProfile(data as Profile)
      return data as Profile
    }
    // Profile missing: recreate it from the auth user so the account still works.
    return ensureProfile(u)
  }, [])

  const refreshSessions = useCallback(async () => {
    if (!supabase || !user) return
    const rows = await fetchSessions(user.id)
    setSessions(rows)
  }, [user])

  useEffect(() => {
    let active = true

    if (!supabase) {
      setLoading(false)
      return
    }

    // Restore an existing session on page load.
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (active && session?.user) {
        const prof = await loadProfile(session.user)
        const authUser = toAuthUser(session.user, prof)
        setUser(authUser)
        if (active && session.user) {
          const rows = await fetchSessions(session.user.id)
          if (active) setSessions(rows)
        }
      }
      if (active) setLoading(false)
    })

    // Keep state in sync with auth changes (login, logout, token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const prof = await loadProfile(session.user)
        if (active) {
          setUser(toAuthUser(session.user, prof))
          setProfile(prof)
          const rows = await fetchSessions(session.user.id)
          if (active) setSessions(rows)
        }
      } else if (active) {
        setUser(null)
        setProfile(null)
        setSessions([])
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(
    async (email: string, password: string, name?: string, avatar?: string) => {
      if (!supabase) throw new Error('Auth no disponible')
      const seed = avatar || randomAvatarSeed()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || '', avatar: seed } },
      })
      if (error) throw error
      // If email confirmation is enabled, data.session is null until confirmed.
      const needsConfirmation = !data.session
      if (data.user && !needsConfirmation) {
        const prof = await ensureProfile(data.user, seed)
        setProfile(prof)
        setUser(toAuthUser(data.user, prof))
      }
      return { needsConfirmation }
    },
    []
  )

  const updateAvatar = useCallback(
    async (avatar: string) => {
      if (!supabase || !user) return
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar })
        .eq('id', user.id)
        .select('*')
        .maybeSingle()
      if (!error && data) setProfile(data as Profile)
    },
    [user]
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error('Auth no disponible')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      if (data.user) {
        const prof = await loadProfile(data.user)
        setUser(toAuthUser(data.user, prof))
      }
    },
    [loadProfile]
  )

  const addXp = useCallback(
    async (amount: number) => {
      if (!supabase || !user) return
      // Compute the new streak on the server side is simpler here: update xp and
      // recompute streak based on last_study_date.
      const today = new Date().toISOString().slice(0, 10)
      const prev = profile?.last_study_date
      let streak = profile?.study_streak ?? 0
      if (prev !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        streak = prev === yesterday ? streak + 1 : 1
      }
      const { data, error } = await supabase
        .from('profiles')
        .update({ xp: (profile?.xp ?? 0) + amount, study_streak: streak, last_study_date: today })
        .eq('id', user.id)
        .select('*')
        .maybeSingle()
      if (!error && data) {
        setProfile(data as Profile)
        // Refresh sessions list too (the completed session is now persisted).
        const rows = await fetchSessions(user.id)
        setSessions(rows)
      }
    },
    [user, profile]
  )

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSessions([])
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, profile, sessions, loading, signUp, signIn, signOut, refreshSessions, addXp, updateAvatar }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
