// src/pages/Relatorios.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Order } from '../db/models'

type WindowPreset = 'TODAY' | 'YESTERDAY' | 'LAST_7D' | 'ALL'

function rangeForPreset(p: WindowPreset) {
  const now = new Date()
  let start = new Date(0)
  let end = new Date(now)
  if (p === 'TODAY') {
    start = new Date(now); start.setHours(0,0,0,0)
  } else if (p === 'YESTERDAY') {
    const y = new Date(now); y.setDate(y.getDate() - 1); y.setHours(0,0,0,0)
    start = y
    end = new Date(y); end.setHours(23,59,59,999)
  } else if (p === 'LAST_7D') {
    const s = new Date(now); s.setDate(s.getDate() - 7)
    start = s
  }
  return { start: +start, end: +end }
}

export default function Relatorios() {
  const [orders, setOrders] = useState<Order[]>([])
  const [preset, setPreset] = useState<WindowPreset>('TODAY')

  useEffect(() => {
    let cancel = false
    async function load() {
      const all = await db.orders.toArray()
      if (!cancel) setOrders(all)
    }
    load()
    const id = setInterval(load, 3000)
    return () => { cancel = true; clearInterval(id) }
  }, [])

  const { start, end } = useMemo(() => rangeForPreset(preset), [preset])

  const sample = useMemo(
    () => orders.filter(o => o.createdAt >= start && o.createdAt <= end && o.status === 'PAID'),
    [orders, start, end]
  )

  const totals = useMemo(() => {
    const count = sample.length
    const gross = sample.reduce((acc, o) => acc + o.total, 0)
    const avg = count ? gross / count : 0
    const payments: Record<string, number> = {}
    const items: Record<string, { qty: number; total: number }> = {}
    const hours: Record<number, number> = {} // hora -> valor

    for (const o of sample) {
      for (const p of o.payments ?? []) {
        payments[p.method] = (payments[p.method] ?? 0) + p.amount
      }
      for (const it of o.items) {
        const key = it.name
        if (!items[key]) items[key] = { qty: 0, total: 0 }
        items[key].qty += it.qty
        items[key].total += it.total
      }
      const h = new Date(o.createdAt).getHours()
      hours[h] = (hours[h] ?? 0) + o.total
    }

    const topItems = Object.entries(items)
      .map(([name, v]) => ({ name, qty: v.qty, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    const peakHours = Object.entries(hours)
      .map(([h, val]) => ({ hour: Number(h), total: val }))
      .sort((a, b) => a.hour - b.hour)

    return { count, gross, avg, payments, topItems, peakHours }
  }, [sample])

  return (
    <div style={{ padding: 16 }}>
      <h2>Relatórios</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <span>Período:</span>
        <button onClick={() => setPreset('TODAY')} style={btn(preset === 'TODAY')}>Hoje</button>
        <button onClick={() => setPreset('YESTERDAY')} style={btn(preset === 'YESTERDAY')}>Ontem</button>
        <button onClick={() => setPreset('LAST_7D')} style={btn(preset === 'LAST_7D')}>Últimos 7 dias</button>
        <button onClick={() => setPreset('ALL')} style={btn(preset === 'ALL')}>Tudo</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <Kpi title="Vendas (qtd)" value={totals.count.toString()} />
        <Kpi title="Faturamento bruto" value={'R$ ' + totals.gross.toFixed(2)} />
        <Kpi title="Ticket médio" value={'R$ ' + totals.avg.toFixed(2)} />
      </div>

      {/* Pagamentos */}
      <section style={{ marginBottom: 16 }}>
        <h3>Pagamentos</h3>
        {Object.keys(totals.payments).length === 0 ? (
          <div style={{ opacity: 0.7 }}>Sem pagamentos no período.</div>
        ) : (
          <ul>
            {Object.entries(totals.payments).map(([m, v]) => (
              <li key={m}>{m}: <b>R$ {v.toFixed(2)}</b></li>
            ))}
          </ul>
        )}
      </section>

      {/* Top itens */}
      <section style={{ marginBottom: 16 }}>
        <h3>Itens mais vendidos (por valor)</h3>
        {totals.topItems.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Sem itens no período.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={th}>Item</th>
                <th style={th}>Qtd</th>
                <th style={th}>Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.topItems.map(it => (
                <tr key={it.name} style={{ borderBottom: '1px solid #f4f4f4' }}>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.qty.toFixed(3).replace('.000', '')}</td>
                  <td style={td}><b>R$ {it.total.toFixed(2)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Horários de pico */}
      <section>
        <h3>Horários de pico (faturamento por hora)</h3>
        {totals.peakHours.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Sem dados no período.</div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160, border: '1px solid #eee', padding: 8, borderRadius: 8 }}>
            {totals.peakHours.map(h => (
              <div key={h.hour} title={`${h.hour}:00`} style={{ width: 18, background: '#0b5', borderRadius: 4, height: barHeight(h.total, totals.peakHours) }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function barHeight(val: number, arr: { total: number }[]) {
  const max = arr.reduce((m, x) => Math.max(m, x.total), 0) || 1
  const pct = val / max
  return Math.max(6, Math.round(pct * 150))
}

function Kpi({ title, value }: { title: string, value: string }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

const btn = (active: boolean): React.CSSProperties => ({
  padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd',
  background: active ? '#222' : '#fff', color: active ? '#fff' : '#222', cursor: 'pointer'
})
const th: React.CSSProperties = { padding: 8 }
const td: React.CSSProperties = { padding: 8 }
