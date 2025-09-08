// src/auth/session.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { Role, User } from '../db/models'
import { findByPin, listUsers } from '../db/users'
import { initDb } from '../db'

type Session = {
  user: User | null
  loginPin: (pin: string) => Promise<boolean>
  logout: () => void
  hasRole: (min: Role) => boolean
}

const Ctx = createContext<Session>(null as any)

const roleOrder: Role[] = ['CAIXA', 'GERENTE', 'ADMIN']
function roleGte(a: Role, b: Role) { return roleOrder.indexOf(a) >= roleOrder.indexOf(b) }

export function SessionProvider({ children }: { children: any }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    (async () => {
      await initDb()
      const raw = localStorage.getItem('pdv_session_user')
      if (raw) setUser(JSON.parse(raw))
      else {
        // fallback: se não houver sessão, mantém null
        await listUsers() // garante seed
      }
    })()
  }, [])

  async function loginPin(pin: string) {
  const u = await findByPin(pin)
  if (!u) return false
  setUser(u)
  localStorage.setItem('pdv_session_user', JSON.stringify(u))
  return true
}


  function logout() {
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

