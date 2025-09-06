// src/pages/RelatorioXZ.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Order } from '../db/models'
import { exportItemsCSV, exportOrdersCSV } from '../lib/csv'
import { getZBaseline, now, saveZClosure, setZBaseline, summarize, listZClosures } from '../db/counters'
import { Link } from 'react-router-dom'
import { printText } from '../mock/devices'
import { ticketX, ticketZ } from '../lib/escpos'
import { findPrinterByDestination } from '../db/settings'
import { getSettings } from '../db/settings'

export default function RelatorioXZ() {
  const [orders, setOrders] = useState<Order[]>([])
  const [baseline, setBaseline] = useState<number>(0)
  const [history, setHistory] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)

  async function refresh() {
    const base = await getZBaseline()
    setBaseline(base)
    const all = await db.orders.where('createdAt').between(base, now(), true, true).and(o => o.status === 'PAID').toArray()
    setOrders(all)
    setHistory(await listZClosures(20))
    setCompany(await getSettings())
  }
  useEffect(() => { refresh() }, [])

  const totals = useMemo(() => summarize(orders), [orders])

  async function imprimirX() {
    const printer = await findPrinterByDestination('CAIXA')
    if (!printer) return alert('Nenhuma impressora de CAIXA configurada em Configurações.')
    const text = ticketX(company, { from: baseline, to: now() }, totals, printer)
    printText(`CAIXA:${Date.now()}`, text)
    alert('Relatório X enviado para impressora (mock). Veja o terminal do WS.')
  }

  async function emitirZ() {
    const from = baseline, to = now()
    await saveZClosure({ createdAt: to, from, to, totals })
    await setZBaseline(to)
    const printer = await findPrinterByDestination('CAIXA')
    if (printer) {
      const zId = (history[0]?.id ?? 0) + 1
      const text = ticketZ(company, { from, to }, totals, printer, zId)
      printText(`CAIXA:${to}`, text)
    }
    alert('Fechamento Z emitido e enviado para impressora (mock).')
    await refresh()
  }

  function exportarCSV(tipo: 'orders' | 'items') {
    const stamp = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)
    if (tipo === 'orders') exportOrdersCSV(orders, `vendas_${stamp}.csv`)
    else exportItemsCSV(orders, `itens_${stamp}.csv`)
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Relatório X/Z</h2>
      <p><b>Período corrente (desde o último Z):</b> {fmtDate(baseline)} → {fmtDate(now())}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <Kpi title="Vendas (qtd)" value={totals.count.toString()} />
        <Kpi title="Faturamento bruto" value={'R$ ' + totals.gross.toFixed(2)} />
        <Kpi title="Pagamentos" value={Object.keys(totals.byMethod).length ? Object.entries(totals.byMethod).map(([m,v]) => `${m}: R$${v.toFixed(2)}`).join(' | ') : '—'} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => exportarCSV('orders')} style={btnLight}>Exportar CSV (Vendas)</button>
        <button onClick={() => exportarCSV('items')} style={btnLight}>Exportar CSV (Itens)</button>
        <button onClick={imprimirX} style={btnLight}>Imprimir X (ESC/POS)</button>
        <button onClick={emitirZ} style={btnPrimary}>Emitir Z (imprime & reinicia)</button>
        <Link to="/relatorios" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <button style={btnLight}>Relatórios →</button>
        </Link>
      </div>

      <h3>Histórico de Z (últimos)</h3>
      {history.length === 0 ? (
        <div style={{ opacity: 0.7 }}>Nenhum fechamento Z registrado.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={th}>Data</th>
              <th style={th}>Período</th>
              <th style={th}>Qtd</th>
              <th style={th}>Bruto</th>
            </tr>
          </thead>
          <tbody>
            {history.map((z: any) => (
              <tr key={z.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                <td style={td}>{fmtDate(z.createdAt)}</td>
                <td style={td}>{fmtDate(z.from)} → {fmtDate(z.to)}</td>
                <td style={td}>{z.totals?.count ?? 0}</td>
                <td style={td}><b>R$ {(z.totals?.gross ?? 0).toFixed(2)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function fmtDate(ts: number) { return new Date(ts).toLocaleString() }
function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
const th: React.CSSProperties = { padding: 8 }
const td: React.CSSProperties = { padding: 8 }
const btnPrimary: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
