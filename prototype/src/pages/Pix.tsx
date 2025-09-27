// src/pages/Pix.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PixQRCode from '../components/PixQRCode'
import { generatePixPayload, makeTxid } from '../lib/pix'

export default function PixPage() {
  const nav = useNavigate()
  const [amount, setAmount] = useState<number>(50)

  const payload = generatePixPayload({
    amount: amount,
    key: 'chave-pix-exemplo@pdv.local',
    txid: makeTxid('PDV'),
    merchant: 'PDVTouch Restaurante',
    city: 'CIDADE',
    description: 'Pagamento PDVTouch',
  })

  function onConfirmMock() {
    alert('Pagamento PIX confirmado (mock)')
    nav('/finalizacao')
  }

  function onCancel() {
    nav('/finalizacao')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Pagamento via PIX</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <PixQRCode value={payload.copiaCola} size={260} />
          <small style={{ opacity: .7 }}>Escaneie o QR Code</small>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div><b>Valor:</b> R$ {amount.toFixed(2)}</div>
          <div><b>TXID:</b> {payload.txid}</div>
          <div><b>Chave:</b> {payload.key}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={onConfirmMock} style={btnPrimary}>
              Confirmar recebimento (mock)
            </button>
            <button onClick={onCancel} style={btnGhost}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  background: '#16a34a',
  color: '#fff',
  border: '1px solid #16a34a',
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