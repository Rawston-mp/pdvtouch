// src/auth/session.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { Role, User } from "../db"
import { initDb } from "../db"
import { findByPin } from "../db/users"

type Session = {
  user: (Pick<User, "id" | "name" | "role">) | null
  hasRole: (r: Role | Role[]) => boolean
  signInWithPin: (pin: string) => Promise<boolean>
  signOut: () => void
}

const SessionCtx = createContext<Session>({
  user: null,
  hasRole: () => false,
  signInWithPin: async () => false,
  signOut: () => {}
})

const LS_KEY = "pdv.session"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Session["user"]>(null)

  useEffect(() => {
    (async () => {
      await initDb()
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          setUser(parsed?.user ?? null)
        } catch { /* ignore */ }
      }
    })()
  }, [])

  const hasRole = (r: Role | Role[]) => {
    if (!user) return false
    const arr = Array.isArray(r) ? r : [r]
    return arr.includes(user.role)
  }

  async function signInWithPin(pin: string) {
    const u = await findByPin(pin)
    if (!u) return false
    const sessionUser = { id: u.id, name: u.name, role: u.role }
    setUser(sessionUser)
    localStorage.setItem(LS_KEY, JSON.stringify({ user: sessionUser }))
    return true
  }

  function signOut() {
    setUser(null)
    localStorage.removeItem(LS_KEY)
  }

  const value = useMemo(() => ({ user, hasRole, signInWithPin, signOut }), [user])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  return useContext(SessionCtx)
}
