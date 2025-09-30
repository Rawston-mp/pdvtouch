// src/pages/SSO/ConsumeFromBackoffice.tsx
import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '../../auth/session'
import type { Role } from '../../db'

function parseToken(tokenB64: string | null): null | { sub?: string; role?: string; exp?: number } {
  if (!tokenB64) return null
  try {
    const json = atob(tokenB64)
    const obj = JSON.parse(json)
    return obj
  } catch {
    return null
  }
}

function mapRole(r?: string): Role {
  const v = (r || '').toUpperCase()
  if (v.includes('ADMIN')) return 'ADMIN'
  if (v.includes('GER')) return 'GERENTE'
  if (v.includes('CAIXA')) return 'CAIXA'
  if (v.includes('BALAN') && v.includes('A')) return 'BALANÇA A'
  if (v.includes('BALAN') && v.includes('B')) return 'BALANÇA B'
  return 'ATENDENTE'
}

export default function ConsumeFromBackoffice() {
  const nav = useNavigate()
  const { signInSSO } = useSession()
  const [sp] = useSearchParams()

  React.useEffect(() => {
    const token = sp.get('token')
    const redirect = sp.get('redirect') || '/venda'
    const payload = parseToken(token)
    if (!payload) {
      alert('Token inválido.')
      nav('/')
      return
    }
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) {
      alert('Token expirado.')
      nav('/')
      return
    }
    const role = mapRole(payload.role)
    const u = {
      id: payload.sub || 'sso-user',
      name: 'SSO',
      role,
    }
    try {
      signInSSO(u)
      nav(redirect)
    } catch (err) {
      console.error(err)
      alert('Falha ao iniciar sessão SSO')
      nav('/')
    }
  }, [nav, signInSSO, sp])

  return (
    <div style={{ padding: 16 }}>
      <h2>Conectando ao PDV…</h2>
      <p>Validando sessão com o Backoffice, aguarde…</p>
    </div>
  )
}
