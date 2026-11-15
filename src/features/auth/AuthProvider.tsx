import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, ElderlyProfile } from '@/types'

export interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  elderlyProfile: ElderlyProfile | null
  currentElderlyId: string | null
  setCurrentElderlyId: (id: string | null) => void
  isLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [elderlyProfile, setElderlyProfile] = useState<ElderlyProfile | null>(null)
  const [currentElderlyId, setCurrentElderlyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profError) {
        console.error('Error fetching profile:', profError)
        return
      }

      setProfile(profData as Profile)

      if (profData?.role === 'elderly') {
        const { data: eldData, error: eldError } = await supabase
          .from('elderly_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (!eldError && eldData) {
          setElderlyProfile(eldData as ElderlyProfile)
          setCurrentElderlyId(eldData.id)
        }
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserProfile(user.id)
    }
  }, [user?.id, fetchUserProfile])

  useEffect(() => {
    let mounted = true

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id).finally(() => {
          if (mounted) setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) {
        await fetchUserProfile(newSession.user.id)
      } else {
        setProfile(null)
        setElderlyProfile(null)
        setCurrentElderlyId(null)
      }
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    setElderlyProfile(null)
    setCurrentElderlyId(null)
  }

  const value: AuthContextType = {
    session,
    user,
    profile,
    elderlyProfile,
    currentElderlyId: elderlyProfile ? elderlyProfile.id : currentElderlyId,
    setCurrentElderlyId,
    isLoading,
    refreshProfile,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
