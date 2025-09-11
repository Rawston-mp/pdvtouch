// src/auth/session.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { UserRole } from '../db/models'
import { findByPin, ensureSeedUsers } from '../db/users'

export type SessionUser = {
  id: number
  name: string
  role: UserRole
  pin: string
  active?: boolean
}

type Session = {
  user: SessionUser | null
  signInWithPin: (pin: string) => Promise<SessionUser | null>
  signOut: () => void
  hasRole: (r: UserRole) => boolean
}

const STORAGE_KEY = 'pdv_session'
const SessionCtx = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)

  // seed de usuários (garante PINs de exemplo)
  useEffect(() => {
    ensureSeedUsers().catch(() => {})
  }, [])

  // carregar sessão do storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  // persistir no storage
  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [user])

  async function signInWithPin(pin: string) {
    const u = await findByPin(pin)
    if (!u || u.active === false) return null
    const s: SessionUser = {
      id: u.id!,
      name: u.name,
      role: u.role,
      pin: u.pin,
      active: u.active,
    }
    setUser(s)
    return s
  }

  function signOut() {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem('pdv_pre_comanda')
    } catch {}
  }

  function hasRole(r: UserRole) {
    return user?.role === r
  }

  const value: Session = useMemo(
    () => ({ user, signInWithPin, signOut, hasRole }),
    [user]
  )

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
