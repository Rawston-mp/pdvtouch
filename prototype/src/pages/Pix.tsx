// src/pages/Pix.tsx
import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PixQRCode from '../components/PixQRCode'
import { generatePixPayload, makeTxid } from '../lib/pix'
import { useSession } from '../auth/session'
import { addSale } from '../db/sales'
import { removeCartDraft, clearCurrentOrderId, renewOrderLock, releaseOrderLock } from '../lib/cartStorage'
import { printText } from '../mock/devices'
import type { CartItem } from '../lib/cartStorage'
import { markAwaitingReturn } from '../lib/comandaUsage'

type DocType = 'NAO_FISCAL' | 'NFCE'
type PixNavState = {
  orderId: number
  amount: number
  cart: CartItem[]
  from?: 'finalizacao'
  doc: DocType
  idFiscal?: string
  cash: number
  tef: number
}

export default function PixPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const navState = useMemo(() => (loc.state ?? {}) as Partial<PixNavState>, [loc.state])
  const { user } = useSession()
  const owner = useMemo(() => (user?.id ? `u:${user.id}` : 'local'), [user?.id])
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  React.useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  const amount = Number(navState?.amount || 0)

  const cart = useMemo(() => Array.isArray(navState?.cart) ? navState.cart as CartItem[] : [], [navState?.cart])
  const orderId = navState?.orderId as number | undefined
  const cash = Number(navState?.cash || 0)
  const tef = Number(navState?.tef || 0)
  const doc = (navState?.doc || 'NAO_FISCAL') as DocType
  const idFiscal = (navState?.idFiscal || '') as string

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
        try { if (orderId) renewOrderLock(orderId, owner) } catch (err) { void err }
        await addSale({
          orderId,
          timestamp: Date.now(),
          userId: user!.id,
          userName: user!.name,
          userRole: user!.role,
          items: cart.map((it) => ({
            id: it.id,
            name: it.name,
            qty: Number(it.qty),
            unitPrice: Number(it.price),
            total: Number(it.qty) * Number(it.price),
          })),
          total,
          payments: { cash, pix: Number(amount), tef },
          docType: doc,
          fiscalId: idFiscal || undefined,
          status: 'COMPLETED'
        })
        printText('fiscal01', `[MOCK] PIX recebido: R$ ${amount.toFixed(2)} | Total R$ ${total.toFixed(2)}`)
        try { markAwaitingReturn(orderId, owner) } catch (err) { void err }
  try { if (orderId) removeCartDraft(orderId) } catch (err) { void err }
  try { clearCurrentOrderId(owner) } catch (err) { void err }
        try { if (orderId) releaseOrderLock(orderId, owner) } catch (err) { void err }
        alert('Pagamento PIX confirmado! Comanda encerrada e registrada no sistema.')
        nav('/relatorioxz')
      } catch (err) {
        console.error(err)
        alert('Erro ao registrar venda PIX. Tente novamente.')
      }
    })()
  }

  function onCancel() {
    try { if (orderId) renewOrderLock(orderId, owner) } catch (err) { void err }
    nav('/finalizacao', { state: navState })
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Pagamento via PIX</h2>

      <div className="pill" style={{ margin: '8px 0', background: isOnline ? '#e8f5e9' : '#ffebee', border: `1px solid ${isOnline ? '#a5d6a7' : '#ef9a9a'}` }}>
        {isOnline ? 'Conectado à internet' : 'Sem internet — recursos do PSP indisponíveis'}
      </div>

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
            <button onClick={onConfirmMock} style={btnPrimary} disabled={!isOnline}
              title={isOnline ? 'Confirmar recebimento (mock)' : 'Indisponível offline'}>
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