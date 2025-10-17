// src/components/LoginPin.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useSession } from '../auth/session'
import { LoadingButton } from './Loading'
import { useLoading } from '../hooks/useLoading'
import { useToast } from '../hooks/useToast'

/**
 * Modal de PIN.
 * - Exibe automaticamente quando não há user na sessão.
 * - Faz login via signInWithPin e fecha ao sucesso.
 */
export default function LoginPin() {
  const { user, signInWithPin } = useSession()
  const [pin, setPin] = useState('')
  const { loading, withLoading } = useLoading()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [user])

  if (user) return null // já logado → não mostra

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const p = pin.trim()
    if (!p) {
      setError('Informe o PIN')
      return
    }
    
    try {
      await withLoading(async () => {
        const logged = await signInWithPin(p)
        if (!logged) {
          setError('PIN inválido ou usuário inativo')
          toast.error('Login falhado', 'PIN inválido ou usuário inativo')
          // foco rápido para nova tentativa
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus()
              inputRef.current.select()
            }
          }, 0)
        } else {
          toast.success('Login realizado', `Bem-vindo ao sistema!`)
        }
        return logged
      }, { minTime: 0 }) // sem atraso mínimo: resposta imediata
    } catch {
      setError('Falha ao autenticar')
      toast.error('Erro de conexão', 'Falha ao conectar com o sistema')
    }
  }

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h2 style={{ marginTop: 0, textAlign: 'center', fontSize: '24px' }}>Digite seu PIN</h2>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="\d*"
            placeholder="Digite seu PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            maxLength={8}
            style={inp}
            className="input-lg"
          />
          {error && <div style={err}>{error}</div>}
          <LoadingButton 
            type="submit" 
            loading={loading} 
            loadingText="🔄 Entrando..."
            style={btn} 
            className="btn-touch-lg btn-primary"
          >
            🔐 Entrar
          </LoadingButton>

          <small style={{ opacity: 0.7 }}>
            Dicas (seed): ADMIN 1111 • BALANÇA A 2222 • BALANÇA B 2233 • GERENTE 3333 • CAIXA 4444 •
            ATENDENTE 5555
          </small>
        </form>
      </div>
    </div>
  )
}

/* estilos inline simples */
const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modal: React.CSSProperties = {
  width: 360,
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
}

const inp: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 16,
}

const btn: React.CSSProperties = {
  border: '1px solid #3b82f6',
  background: '#3b82f6',
  color: '#fff',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 16,
  cursor: 'pointer',
}

const err: React.CSSProperties = {
  color: '#b91c1c',
  fontSize: 14,
}
