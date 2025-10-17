// src/auth/session.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Role, User } from '../db'
import { initDb, repairDefaultUsers } from '../db'
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
  const initOnceRef = useRef(false)

  useEffect(() => {
    if (initOnceRef.current) return
    initOnceRef.current = true
    ;(async () => {
      try {
        // Log apenas em desenvolvimento
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
          console.log('🔄 Iniciando inicialização da sessão...')
        }
        await initDb()
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
          console.log('✅ Banco inicializado com sucesso')
        }
        
        const raw = localStorage.getItem(LS_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (parsed?.user?.id && parsed?.user?.role) {
              setUser(parsed.user)
              if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
                console.log('✅ Sessão restaurada:', parsed.user.name)
              }
            }
          } catch {
            localStorage.removeItem(LS_KEY)
            if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
              console.log('⚠️ Sessão inválida removida')
            }
          }
        } else {
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
            console.log('ℹ️ Nenhuma sessão salva encontrada')
          }
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar sessão:', error)
      } finally {
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
          console.log('🎉 Inicialização da sessão concluída')
        }
        setIsLoaded(true)
      }
    })()
  }, [])

  const hasRole = React.useCallback((r: Role | Role[]) => {
    if (!user) return false
    const arr = Array.isArray(r) ? r : [r]
    return arr.includes(user.role)
  }, [user])

  const signInWithPin = React.useCallback(async (pin: string) => {
    try {
      if (!pin || pin.length < 4) return false
      const t0 = performance.now?.() ?? Date.now()
      let u = await findByPin(pin)
      if (!u || !u.active) {
        // Tentativa de reparo automática: garante usuários padrão e tenta novamente
        try {
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
            console.log('🛠️  Login falhou — tentando reparar usuários padrão e repetir...')
          }
          const res = await repairDefaultUsers()
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
            console.log(`🛠️  Reparados: criados=${res.created} ajustados=${res.updated}`)
          }
          u = await findByPin(pin)
        } catch {
          // Se o reparo falhar, segue o fluxo normal
        }
      }
      if (!u || !u.active) {
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
          const dt = (performance.now?.() ?? Date.now()) - t0
          console.log(`❌ Login falhou (PIN inválido/usuário inativo) em ${Math.round(dt)}ms`)
        }
        return false
      }

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
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS) {
        const dt = (performance.now?.() ?? Date.now()) - t0
        console.log(`✅ Login OK: ${sessionUser.name} — ${sessionUser.role} em ${Math.round(dt)}ms`)
      }
      return true
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    }
  }, [])

  const signOut = React.useCallback(() => {
    setUser(null)
    localStorage.removeItem(LS_KEY)
  }, [])

  const isAuthenticated = !!user

  const value = useMemo(
    () => ({
      user,
      hasRole,
      signInWithPin,
      signOut,
      isAuthenticated,
    }),
    [user, isAuthenticated, hasRole, signInWithPin, signOut],
  )

  if (!isLoaded) {
    return <div>Carregando...</div>
  }

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() { return useContext(SessionCtx) }
