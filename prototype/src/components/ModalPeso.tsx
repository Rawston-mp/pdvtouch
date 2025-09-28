// src/components/ModalPeso.tsx
import { useEffect, useRef, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (kg: number) => void
  title?: string
  initialKg?: number | null
}

function parseKg(input: string): number {
  // aceita vírgula ou ponto
  const n = Number(input.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export default function ModalPeso({ open, onClose, onConfirm, title = 'Informar peso (kg)', initialKg }: Props) {
  const [value, setValue] = useState<string>(initialKg ? String(initialKg) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
      setValue(initialKg ? String(initialKg).replace('.', ',') : '')
    }
  }, [open, initialKg])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'Enter') { e.preventDefault(); submit() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, value])

  function submit() {
    const kg = parseKg(value.trim())
    if (!Number.isFinite(kg) || kg <= 0) {
      alert('Peso inválido. Ex.: 0,350')
      inputRef.current?.focus()
      return
    }
    onConfirm(Number(kg.toFixed(3)))
  }

  if (!open) return null

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
        <div style={{ fontSize: 12, opacity: .7, marginBottom: 6 }}>
          Dica: use vírgula ou ponto. Ex.: <b>0,350</b>
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="0,000"
          inputMode="decimal"
          style={input}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancelar (Esc)</button>
          <button onClick={submit} style={{ background: '#0b5', color: '#fff' }}>Confirmar (Enter)</button>
        </div>
      </div>
    </div>
  )
}

const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
}

const modal: React.CSSProperties = {
  width: 380,
  maxWidth: '92vw',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 10px 30px rgba(0,0,0,.25)',
  padding: 16
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 18,
  textAlign: 'center'
}
