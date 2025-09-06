// src/pages/Impressao.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Order } from '../db/models'
import { printText } from '../mock/devices'
import { Link } from 'react-router-dom'
import { findPrinterByDestination, getSettings } from '../db/settings'
import { ticketKitchen } from '../lib/escpos'

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
    const id = setInterval(load, 2000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return orders
    const start = new Date(); start.setHours(0,0,0,0)
    const ts = +start
    return orders.filter(o => o.createdAt >= ts)
  }, [orders, filter])

  function formatDate(ts: number) { return new Date(ts).toLocaleString() }

  async function reprint(o: Order) {
    // Envia tickets por destino (se houver impressoras configuradas)
    const [pCoz, pBar] = await Promise.all([
      findPrinterByDestination('COZINHA'),
      findPrinterByDestination('BAR')
    ])
    const cozItems = o.items.filter(i => (i.route ?? 'COZINHA') === 'COZINHA')
    const barItems = o.items.filter(i => (i.route ?? 'BAR') === 'BAR')
    if (cozItems.length && pCoz) {
      const text = ticketKitchen('COZINHA', cozItems as any, pCoz, o.id)
      printText(`COZ:${o.id}`, text)
    }
    if (barItems.length && pBar) {
      const text = ticketKitchen('BAR', barItems as any, pBar, o.id)
      printText(`BAR:${o.id}`, text)
    }
    alert('Reimpressão enviada (mock). Veja o terminal do WS.')
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
                      {i.name} — {i.isWeight ? `${i.qty.toFixed(3)}kg` : `${i.qty} un`} — R$ {i.total.toFixed(2)} <i style={{opacity:.6}}>({i.route ?? '—'})</i>
                    </div>
                  ))}
                </td>
                <td style={{ padding: 8 }}><b>R$ {o.total.toFixed(2)}</b></td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => reprint(o)} style={btnLight}>Reimprimir (cozinha/bar)</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const btn = (active: boolean): React.CSSProperties => ({
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
  background: active ? '#222' : '#fff', color: active ? '#fff' : '#222', cursor: 'pointer'
})
const btnPrimary: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
