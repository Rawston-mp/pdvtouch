// src/pages/Pix.tsx
import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PixQRCode from '../components/PixQRCode'
import { generatePixPayload, makeTxid } from '../lib/pix'
import { useSession } from '../auth/session'
import { addSale } from '../db/sales'
import { removeCartDraft, clearCurrentOrderId } from '../lib/cartStorage'
import { printText } from '../mock/devices'

export default function PixPage() {
  const nav = useNavigate()
  const { state } = useLocation() as any
  const { user } = useSession()
  const [amount, setAmount] = useState<number>(state?.amount || 0)

  const cart = useMemo(() => Array.isArray(state?.cart) ? state.cart : [], [state])
  const orderId = state?.orderId as number | undefined
  const cash = Number(state?.cash || 0)
  const tef = Number(state?.tef || 0)
  const doc = (state?.doc || 'NAO_FISCAL') as 'NAO_FISCAL' | 'NFCE'
  const idFiscal = (state?.idFiscal || '') as string

  const payload = generatePixPayload({
    amount: amount,
    key: 'chave-pix-exemplo@pdv.local',
    txid: makeTxid('PDV'),
    merchant: 'PDVTouch Restaurante',
    city: 'CIDADE',
    description: 'Pagamento PDVTouch',
  })

  function onConfirmMock() {
    // Registra a venda com PIX
    if (!orderId || !cart?.length) {
      alert('Dados incompletos do pedido.')
      return
    }
    const total = Number(amount) + cash + tef
    ;(async () => {
      try {
        await addSale({
          orderId,
          timestamp: Date.now(),
          userId: user!.id,
          userName: user!.name,
          userRole: user!.role,
          items: cart,
          total,
          payments: { cash, pix: Number(amount), tef },
          docType: doc,
          fiscalId: idFiscal || undefined,
          status: 'COMPLETED'
        })
        printText('fiscal01', `[MOCK] PIX recebido: R$ ${amount.toFixed(2)} | Total R$ ${total.toFixed(2)}`)
        try { if (orderId) removeCartDraft(orderId) } catch {}
        try { clearCurrentOrderId() } catch {}
        alert('Pagamento PIX confirmado! Comanda encerrada e registrada no sistema.')
        nav('/relatorioxz')
      } catch (err) {
        console.error(err)
        alert('Erro ao registrar venda PIX. Tente novamente.')
      }
    })()
  }

  function onCancel() {
    nav('/finalizacao', { state })
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