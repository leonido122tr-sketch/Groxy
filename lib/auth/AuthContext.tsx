'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'

type AuthContextValue = {
  user: User | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  user,
  children,
}: {
  user: User | null
  children: ReactNode
}) {
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    return { user: null }
  }
  return ctx
}
