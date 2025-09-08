// src/components/LoginPin.tsx
import { useEffect, useState } from 'react'
import { useSession } from '../auth/session'

export default function LoginPin({ open }: { open: boolean }) {
  const { loginPin } = useSession()
  const [pin, setPin] = useState('')

  useEffect(() => { if (!open) setPin('') }, [open])

  if (!open) return null

  async function onOk() {
    if (!pin) return
    const ok = await loginPin(pin)
    if (!ok) {
      alert('PIN inválido')
      return
    }
    // força reload para atualizar cabeçalho e permissões
    window.location.hash = ''
    window.location.reload()
  }

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3>Entrar com PIN</h3>
        <input
          autoFocus
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onOk() }}
          style={inp}
        />
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <button onClick={onOk} style={btnPrimary}>Entrar</button>
          <button onClick={() => { window.location.hash = '' }} style={btnLight}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

const backdrop: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'grid', placeItems:'center', zIndex:9999 }
const modal: React.CSSProperties = { background:'#fff', padding:16, borderRadius:12, minWidth:300, boxShadow:'0 10px 30px rgba(0,0,0,.2)' }
const inp: React.CSSProperties = { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd', width:'100%' }
const btnPrimary: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid #0b5', background:'#0b5', color:'#fff', cursor:'pointer' }
const btnLight: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer' }
