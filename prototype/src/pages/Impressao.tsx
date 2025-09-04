// src/pages/Impressao.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Order } from '../db/models'
import { printText } from '../mock/devices'
import { Link } from 'react-router-dom'

export default function Impressao() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<'ALL' | 'TODAY'>('TODAY')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const all = await db.orders.orderBy('createdAt').reverse().toArray()
      if (!cancelled) setOrders(all)
    }
    load()
    const id = setInterval(load, 2000) // atualiza a cada 2s
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return orders
    const start = new Date(); start.setHours(0,0,0,0)
    const ts = +start
    return orders.filter(o => o.createdAt >= ts)
  }, [orders, filter])

  function formatDate(ts: number) {
    const d = new Date(ts)
    return d.toLocaleString()
  }

  function couponText(o: Order) {
    const lines: string[] = []
    lines.push('PDVTouch - Reimpressão')
    lines.push(`Pedido: ${o.id}`)
    lines.push(`Data:   ${formatDate(o.createdAt)}`)
    lines.push('--------------------------------')
    o.items.forEach(i => {
      const q = i.isWeight ? `${i.qty.toFixed(3)}kg` : `${i.qty}x`
      lines.push(`${truncate(i.name, 24)}  ${q}  R$ ${i.total.toFixed(2)}`)
    })
    lines.push('--------------------------------')
    lines.push(`TOTAL: R$ ${o.total.toFixed(2)}`)
    if (o.payments?.length) {
      lines.push('Pagamentos:')
      for (const p of o.payments) {
        lines.push(` - ${p.method}  R$ ${p.amount.toFixed(2)}`)
      }
    }
    lines.push('')
    lines.push('Obrigado!')
    return lines.join('\n')
  }

  function reprint(o: Order) {
    const text = couponText(o)
    printText(o.id, text) // mock: imprime via WS
    alert('Cupom enviado para impressora (mock). Veja o terminal do WS.')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Impressão</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setFilter('TODAY')} style={btn(filter==='TODAY')}>Hoje</button>
        <button onClick={() => setFilter('ALL')} style={btn(filter==='ALL')}>Todos</button>
        <Link to="/" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <button style={btnPrimary}>← Voltar à Venda</button>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div style={{ opacity: 0.7 }}>Nenhum pedido encontrado.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 8 }}>Data</th>
              <th style={{ padding: 8 }}>Itens</th>
              <th style={{ padding: 8 }}>Total</th>
              <th style={{ padding: 8 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                <td style={{ padding: 8 }}>{formatDate(o.createdAt)}</td>
                <td style={{ padding: 8 }}>
                  {o.items.map(i => (
                    <div key={i.id} style={{ opacity: 0.85 }}>
                      {truncate(i.name, 26)} — {i.isWeight ? `${i.qty.toFixed(3)}kg` : `${i.qty} un`} — R$ {i.total.toFixed(2)}
                    </div>
                  ))}
                </td>
                <td style={{ padding: 8 }}><b>R$ {o.total.toFixed(2)}</b></td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => reprint(o)} style={btnLight}>Reimprimir (mock)</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function truncate(s: string, len: number) { return s.length > len ? s.slice(0, len - 1) + '…' : s }
const btn = (active: boolean): React.CSSProperties => ({
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
  background: active ? '#222' : '#fff', color: active ? '#fff' : '#222', cursor: 'pointer'
})
const btnPrimary: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
