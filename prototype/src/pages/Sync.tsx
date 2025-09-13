// src/pages/Sync.tsx
// Tela simples de Sync/Diagnóstico + botão de teste para imprimir "Fechamento de Turno"

import React, { useState } from 'react'
import { useSession } from '../auth/session'
import { getSettings, findPrinterByDestination } from '../db/settings'
import { printRaw } from '../lib/printClient'
import { ticketCloseShift } from '../lib/escposTurno'

export default function Sync() {
  const { user } = useSession()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>('')

  async function onTestPrintClose() {
    try {
      setBusy(true); setMsg('Gerando ticket de fechamento (teste)...')
      const cfg = await getSettings()
      const printer = (await findPrinterByDestination('CAIXA'))?.name || 'CAIXA'

      // mocks para teste
      const now = new Date()
      const period = {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toLocaleString(),
        to: now.toLocaleString(),
      }

      const bytes = ticketCloseShift({
        header: {
          companyName: cfg.companyName ?? 'PDVTouch Restaurante',
          cnpj: cfg.cnpj ?? undefined,
          posName: 'PDV-01',
        },
        shiftNumber: 999,
        operator: { name: user?.name ?? '-', role: user?.role ?? 'CAIXA' },
        period,
        counters: { salesQty: 4, gross: 88.78, avgTicket: 22.2 },
        payments: { CASH: 40.69, PIX: 48.09, TEF: 0 },
        drawer: { opening: 150, cashIn: 0, cashOut: 0, expected: 190.69, actual: 190.69, difference: 0 },
        timestamp: now.toLocaleString(),
        notes: 'Ticket de teste via página Sync.',
      })

      await printRaw(bytes, printer)
      setMsg('Ticket enviado para a impressora.')
    } catch (e: any) {
      console.error(e)
      setMsg(`Falha: ${e?.message ?? e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Sync / Diagnóstico</h2>

      <div style={card}>
        <p>Use esta tela para testes de comunicação (mock) e diagnóstico.</p>
        <button
          style={btn}
          disabled={busy}
          onClick={onTestPrintClose}
          title="Imprime um ticket de FECHAMENTO DE TURNO (mock) usando ESC/POS real"
        >
          {busy ? 'Enviando...' : 'Imprimir Fechamento (teste)'}
        </button>
        {msg && <div style={{ marginTop: 8, fontSize: 14, opacity: .9 }}>{msg}</div>}
      </div>
    </div>
  )
}

// estilos
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 16,
  maxWidth: 560,
}

const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #ddd',
  background: '#3b82f6',
  color: '#fff',
  cursor: 'pointer',
}
