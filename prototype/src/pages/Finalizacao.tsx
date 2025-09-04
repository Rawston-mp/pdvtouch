import { useEffect, useMemo, useState } from 'react'
import PixQRCode from '../components/PixQRCode'
import { loadCart, clearCartStorage } from '../lib/cartStorage'
import { makePixEmvMock } from '../lib/pix'
import { db } from '../db'
import { enqueue } from '../db/outbox'
import type { Order, Payment } from '../db/models'
import { OrderSchema } from '../domain/schemas'
import { Link, useNavigate } from 'react-router-dom'

export default function Finalizacao() {
  const navigate = useNavigate()
  const [emv, setEmv] = useState<string | null>(null)
  const [txid, setTxid] = useState<string | null>(null)
  const [method, setMethod] = useState<'PIX' | 'CASH'>('PIX')
  const [processing, setProcessing] = useState(false)

  const cart = useMemo(() => loadCart(), [])
  const total = cart?.total ?? 0

  useEffect(() => {
    if (!cart || (cart?.items?.length ?? 0) === 0) {
      alert('Carrinho vazio. Retornando para venda.')
      navigate('/')
    }
  }, [cart, navigate])

  function gerarPix() {
    const { emv, txid } = makePixEmvMock(total)
    setEmv(emv)
    setTxid(txid)
  }

  async function confirmarPagamento() {
    if (!cart || cart.items.length === 0) return
    setProcessing(true)
    try {
      const orderId = crypto.randomUUID()
      const payments: Payment[] = [
        method === 'PIX'
          ? { id: crypto.randomUUID(), method: 'PIX', amount: total, meta: { txid } }
          : { id: crypto.randomUUID(), method: 'CASH', amount: total }
      ]

      const order: Order = {
        id: orderId,
        createdAt: Date.now(),
        status: 'PAID',
        items: cart.items,
        payments,
        total
      }

      // valida
      //OrderSchema.parse(order)

      // grava
      await db.orders.add(order)

      // outbox
      await enqueue({ id: orderId, type: 'ORDER_PAID', payload: order })

      // limpa carrinho e vai para impressão
      clearCartStorage()
      alert('Pagamento confirmado (mock). Pedido salvo na fila offline.')
      navigate('/impressao')
    } catch (e: any) {
      console.error(e)
      alert('Falha ao confirmar pagamento: ' + (e?.message ?? e))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <section>
        <h2>Finalização</h2>
        <p>Total da venda: <b>R$ {total.toFixed(2)}</b></p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ marginRight: 12 }}>
            <input type="radio" name="pay" checked={method === 'PIX'} onChange={() => setMethod('PIX')} /> PIX
          </label>
          <label>
            <input type="radio" name="pay" checked={method === 'CASH'} onChange={() => setMethod('CASH')} /> Dinheiro
          </label>
        </div>

        {method === 'PIX' && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <button onClick={gerarPix} style={{ padding: 10, borderRadius: 8 }}>Gerar PIX</button>
            {emv && <PixQRCode payload={emv} caption={`TXID: ${txid}`} />}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={confirmarPagamento} disabled={processing} style={btnPrimary}>
            {processing ? 'Processando...' : 'Confirmar pagamento'}
          </button>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button style={btnLight}>Voltar</button>
          </Link>
        </div>
      </section>

      <aside style={{ borderLeft: '1px solid #eee', paddingLeft: 16 }}>
        <h3>Resumo</h3>
        <ul>
          {cart?.items?.map(i => (
            <li key={i.id}>
              {i.name} — {i.isWeight ? `${i.qty.toFixed(3)}kg` : `${i.qty} un`} · R$ {i.total.toFixed(2)}
            </li>
          ))}
        </ul>
        <hr />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total</span>
          <b>R$ {total.toFixed(2)}</b>
        </div>
      </aside>
    </div>
  )
}

const btnPrimary: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, background: '#0b5', color: '#fff', border: '1px solid #0b5', cursor: 'pointer' }
const btnLight: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, background: '#fff', border: '1px solid #ddd', cursor: 'pointer' }
