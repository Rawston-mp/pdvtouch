// src/auth/session.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Role, User } from '../db'
import { initDb } from '../db'
import { findByPin } from '../db/users'

type SessionUser = Pick<User, 'id' | 'name' | 'role'>

type Session = {
  user: SessionUser | null
  hasRole: (r: Role | Role[]) => boolean
  signInWithPin: (pin: string) => Promise<boolean>
  signOut: () => void
  isAuthenticated: boolean
}

const SessionCtx = createContext<Session>({
  user: null,
  hasRole: () => false,
  signInWithPin: async () => false,
  signOut: () => {},
  isAuthenticated: false,
})

const LS_KEY = 'pdv.session.v2'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        console.log('🔄 Iniciando inicialização da sessão...')
        await initDb()
        console.log('✅ Banco inicializado com sucesso')
        
        const raw = localStorage.getItem(LS_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (parsed?.user?.id && parsed?.user?.role) {
              setUser(parsed.user)
              console.log('✅ Sessão restaurada:', parsed.user.name)
            }
          } catch {
            localStorage.removeItem(LS_KEY)
            console.log('⚠️ Sessão inválida removida')
          }
        } else {
          console.log('ℹ️ Nenhuma sessão salva encontrada')
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar sessão:', error)
      } finally {
        console.log('🎉 Inicialização da sessão concluída')
        setIsLoaded(true)
      }
    })()
  }, [])

  const hasRole = (r: Role | Role[]) => {
    if (!user) return false
    const arr = Array.isArray(r) ? r : [r]
    return arr.includes(user.role)
  }

  async function signInWithPin(pin: string) {
    try {
      if (!pin || pin.length < 4) return false

      const u = await findByPin(pin)
      if (!u || !u.active) return false

      const sessionUser: SessionUser = {
        id: u.id,
        name: u.name,
        role: u.role,
      }

      setUser(sessionUser)
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          user: sessionUser,
          timestamp: Date.now(),
        }),
      )

      return true
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    }
  }

  function signOut() {
    setUser(null)
    localStorage.removeItem(LS_KEY)
  }

  const isAuthenticated = !!user

  const value = useMemo(
    () => ({
      user,
      hasRole,
      signInWithPin,
      signOut,
      isAuthenticated,
    }),
    [user],
  )

  if (!isLoaded) {
    return <div>Carregando...</div>
  }

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  return useContext(SessionCtx)
}
