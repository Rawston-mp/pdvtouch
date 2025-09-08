// src/auth/session.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { Role, User } from '../db/models'
import { findByPin, listUsers } from '../db/users'
import { initDb } from '../db'
import { logAudit } from '../db/audit'

type Session = {
  user: User | null
  loginPin: (pin: string) => Promise<boolean>
  logout: () => void
  hasRole: (min: Role) => boolean
}

const Ctx = createContext<Session>(null as any)

// ordem hierárquica (BALANÇA < CAIXA < GERENTE < ADMIN)
const roleOrder: Role[] = ['BALANÇA', 'CAIXA', 'GERENTE', 'ADMIN']
function roleGte(a: Role, b: Role) { return roleOrder.indexOf(a) >= roleOrder.indexOf(b) }

export function SessionProvider({ children }: { children: any }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    (async () => {
      await initDb()
      const raw = localStorage.getItem('pdv_session_user')
      if (raw) setUser(JSON.parse(raw))
      else await listUsers()
    })()
  }, [])

  async function loginPin(pin: string) {
    const u = await findByPin(pin)
    if (!u) return false
    setUser(u)
    localStorage.setItem('pdv_session_user', JSON.stringify(u))
    await logAudit({ action: 'LOGIN', userName: u.name, details: { role: u.role } })
    return true
  }

  function logout() {
    if (user) logAudit({ action: 'LOGOUT', userName: user.name })
    setUser(null)
    localStorage.removeItem('pdv_session_user')
  }

  function hasRole(min: Role) {
    if (!user) return false
    return roleGte(user.role, min)
  }

  return <Ctx.Provider value={{ user, loginPin, logout, hasRole }}>{children}</Ctx.Provider>
}

export function useSession() { return useContext(Ctx) }
