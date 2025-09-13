// src/pages/Pix.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PixQRCode from '../components/PixQRCode'
import { generatePixPayload, makeTxid } from '../lib/pix'

type LocationState = {
  amount: number
  orderDraft?: any
  txid?: string
  key?: string
}

export default function PixPage() {
  const nav = useNavigate()
  const { state } = useLocation()
  const { amount, orderDraft, txid, key } = (state || {}) as LocationState

  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(300) // 5min (mock)
  const timerRef = useRef<number | null>(null)

  // Se não vier amount válido, volta para Finalização
  useEffect(() => {
    if (!(typeof amount === 'number' && amount > 0)) {
      nav('/finalizacao', { replace: true })
    }
  }, [amount, nav])

  // Payload PIX (mock) – sempre gera string
  const payload = useMemo(() => {
    const amt = Number(amount || 0)
    const p = generatePixPayload({
      amount: isFinite(amt) ? amt : 0,
      key: key ?? 'chave-pix-exemplo@pdv.local',
      txid: txid ?? makeTxid('PDV'),
      merchant: 'PDVTouch Restaurante',
      city: 'CIDADE',
      description: 'Pagamento PDVTouch',
    })
    return p
  }, [amount, key, txid])

  // Contagem regressiva
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  // Atalhos
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key.toLowerCase() === 'f2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault()
        onConfirmMock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onCopy() {
    const text = payload?.copiaCola ?? ''
    if (!text) return
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function onCancel() {
    nav('/finalizacao', { replace: true, state: { orderDraft } })
  }

  function onConfirmMock() {
    nav('/finalizacao', {
      replace: true,
      state: {
        orderDraft,
        pixPaid: true,
        pixAmount: payload?.amount ?? 0,
        pixTxid: payload?.txid ?? '',
      },
    })
  }

  const mm = Math.floor(countdown / 60).toString().padStart(2, '0')
  const ss = (countdown % 60).toString().padStart(2, '0')

  // Safety: só renderiza QR se tivermos payload e copiaCola string
  const qrValue = payload?.copiaCola ? String(payload.copiaCola) : ''

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Pagamento via PIX</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
            <PixQRCode value={qrValue} size={260} />
            <small style={{ opacity: .7 }}>Escaneie o QR Code</small>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div><b>Valor:</b> R$ {(payload?.amount ?? 0).toFixed(2)}</div>
            <div><b>TXID:</b> {payload?.txid ?? '-'}</div>
            <div><b>Chave:</b> {payload?.key ?? '—'}</div>
            <div><b>Expira em:</b> {mm}:{ss}</div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={onCopy} style={btnOutline}>
                {copied ? 'Copiado!' : 'Copiar “copia e cola”'}
              </button>
              <button onClick={onConfirmMock} style={btnPrimary} title="F2">
                Confirmar recebimento (mock)
              </button>
              <button onClick={onCancel} style={btnGhost} title="Esc">Cancelar</button>
            </div>

            <small style={{ opacity: .7 }}>
              Atalhos: <b>F2</b> confirmar • <b>Esc</b> cancelar • <b>Ctrl+Enter</b> confirmar
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}

/* estilos */
const wrap: React.CSSProperties = { padding: 16 }
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 4px 16px rgba(0,0,0,.06)',
  maxWidth: 900,
}
const btnPrimary: React.CSSProperties = {
  background: '#16a34a',
  color: '#fff',
  border: '1px solid #16a34a',
  padding: '10px 12px',
  borderRadius: 8,
  cursor: 'pointer',
}
const btnOutline: React.CSSProperties = {
  background: '#fff',
  color: '#2563eb',
  border: '1px solid #2563eb',
  padding: '10px 12px',
  borderRadius: 8,
  cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  background: '#fff',
  color: '#333',
  border: '1px solid #ddd',
  padding: '10px 12px',
  borderRadius: 8,
  cursor: 'pointer',
}
