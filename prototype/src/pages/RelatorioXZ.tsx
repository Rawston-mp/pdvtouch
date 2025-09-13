// src/pages/RelatorioXZ.tsx
import React, { useMemo, useState } from 'react'
import { ticketX, ticketZ, PaymentsBreakdown } from '../lib/escpos'
import { printRaw } from '../lib/printClient'
import { getSettings } from '../db/settings'

type Totais = {
  salesQty: number
  gross: number
  avgTicket: number
  payments: PaymentsBreakdown
}

function useTotaisMock(): Totais {
  // Ajuste aqui para buscar dados reais do seu IndexedDB (orders, payments, etc.)
  const itemsQty = 4
  const gross = 88.78
  const avg = gross / itemsQty
  const payments: PaymentsBreakdown = { CASH: 40.69, PIX: 48.09 }
  return { salesQty: itemsQty, gross, avgTicket: avg, payments }
}

export default function RelatorioXZ() {
  const [status, setStatus] = useState('')
  const totais = useTotaisMock()

  const periodo = useMemo(() => {
    const now = new Date()
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const fmt = (d: Date) => d.toLocaleString()
    return { from: fmt(start), to: fmt(now) }
  }, [])

  async function handlePrintX() {
    try {
      setStatus('Gerando X...')
      const cfg = await getSettings()
      const bytes = ticketX({
        header: { name: cfg.companyName ?? 'PDVTouch', cnpj: cfg.cnpj ?? undefined },
        period: periodo,
        counters: { salesQty: totais.salesQty, gross: totais.gross, avgTicket: totais.avgTicket },
        payments: totais.payments,
        topItems: [
          { name: 'Buffet', qty: 0.701, total: 40.59 },
          { name: 'Churrasco Kg', qty: 0.555, total: 32.69 },
        ],
      })
      setStatus('Imprimindo X (CAIXA)...')
      await printRaw(bytes, 'CAIXA')
      setStatus('Relatório X impresso.')
    } catch (e: any) {
      setStatus(`Erro: ${e.message ?? e}`)
    }
  }

  async function handleEmitZ() {
    try {
      setStatus('Gerando Z...')
      const cfg = await getSettings()
      // Em produção, incremente e persista zNumber
      const zNumber = Number(localStorage.getItem('pdv.lastZ') || '0') + 1
      localStorage.setItem('pdv.lastZ', String(zNumber))

      const bytes = ticketZ({
        header: { name: cfg.companyName ?? 'PDVTouch', cnpj: cfg.cnpj ?? undefined },
        period: periodo,
        counters: { salesQty: totais.salesQty, gross: totais.gross, avgTicket: totais.avgTicket },
        payments: totais.payments,
        zNumber,
        notes: 'Fechamento Z emitido e enviado para impressora (mock).',
      })
      setStatus('Imprimindo Z (CAIXA)...')
      await printRaw(bytes, 'CAIXA')
      setStatus('Z impresso com sucesso.')
    } catch (e: any) {
      setStatus(`Erro: ${e.message ?? e}`)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Relatório X/Z</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handlePrintX} style={btn}>Imprimir X (ESC/POS)</button>
        <button onClick={handleEmitZ} style={{ ...btn, background: '#16a34a', color: '#fff', borderColor: '#15803d' }}>
          Emitir Z (imprime & reinicia)
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 10, background: '#fafafa' }}>
        <b>Status:</b> {status || 'Pronto.'}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ margin: 0 }}>Resumo atual</h3>
        <p style={{ marginTop: 6 }}>
          Vendas: <b>{totais.salesQty}</b> • Bruto: <b>R$ {totais.gross.toFixed(2)}</b> • Ticket médio: <b>R$ {totais.avgTicket.toFixed(2)}</b>
        </p>
        <p style={{ marginTop: 6 }}>
          Pagamentos: CASH <b>R$ {(totais.payments.CASH ?? 0).toFixed(2)}</b> • PIX <b>R$ {(totais.payments.PIX ?? 0).toFixed(2)}</b> • TEF <b>R$ {(totais.payments.TEF ?? 0).toFixed(2)}</b>
        </p>
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
}
