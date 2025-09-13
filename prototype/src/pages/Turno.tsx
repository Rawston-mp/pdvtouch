// src/pages/Turno.tsx
// UI de Turno: abertura, sangria/suprimento e fechamento com tickets ESC/POS.

import React, { useEffect, useMemo, useState } from 'react'
import { useSession } from '../auth/session'
import { getSettings, findPrinterByDestination } from '../db/settings'
import { printRaw } from '../lib/printClient'
import {
  ticketOpenShift,
  ticketCashMovement,
  ticketCloseShift,
  type CashMovementType,
} from '../lib/escposTurno'

// ============================================================================
// Carregamento LAZY (dinâmico) do módulo ../db/shifts (se existir)
// ============================================================================
type ShiftsApi = {
  getCurrentShift?: () => Promise<any>
  openShift?: (initialCash: number) => Promise<void>
  addMovement?: (type: CashMovementType, amount: number, reason?: string) => Promise<void>
  listMovements?: () => Promise<any[]>
  closeShift?: () => Promise<void>
}

let shiftsApi: ShiftsApi | null = null
let shiftsLoaded = false

async function ensureShiftsApi(): Promise<ShiftsApi> {
  if (shiftsLoaded && shiftsApi) return shiftsApi
  try {
    const mod: ShiftsApi = await import('../db/shifts')
    shiftsApi = mod ?? {}
  } catch {
    shiftsApi = {}
  } finally {
    shiftsLoaded = true
  }
  return shiftsApi!
}

// ============================================================================

type MovementRow = {
  id?: string
  type: CashMovementType
  amount: number
  reason?: string
  timestamp: string
}

type ShiftInfo = {
  id?: number | string
  number?: number | string
  openedAt?: string
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const money = (v: number) => BRL.format(Number(v || 0))

async function resolvePrinterName(dest: 'CAIXA' | 'COZINHA' | 'BAR' = 'CAIXA') {
  try {
    const p = await findPrinterByDestination(dest)
    return p?.name || 'CAIXA'
  } catch {
    return 'CAIXA'
  }
}

// Mock de totais — troque depois por consultas reais ao IndexedDB
function getPeriodTotals() {
  const salesQty = Number(localStorage.getItem('pdv.mock.salesQty') || '0')
  const gross = Number(localStorage.getItem('pdv.mock.gross') || '0')
  const avgTicket = salesQty > 0 ? gross / salesQty : 0
  const CASH = Number(localStorage.getItem('pdv.mock.pay.cash') || '0')
  const PIX  = Number(localStorage.getItem('pdv.mock.pay.pix') || '0')
  const TEF  = Number(localStorage.getItem('pdv.mock.pay.tef') || '0')
  return { salesQty, gross, avgTicket, payments: { CASH, PIX, TEF } }
}

export default function Turno() {
  const { user } = useSession()

  const [shift, setShift] = useState<ShiftInfo | null>(null)
  const [movements, setMovements] = useState<MovementRow[]>([])

  // abertura
  const [initialCash, setInitialCash] = useState<string>('0')

  // movimentação
  const [movType, setMovType] = useState<CashMovementType>('SUPRIMENTO')
  const [movValue, setMovValue] = useState<string>('0')
  const [movReason, setMovReason] = useState<string>('')

  // fechamento
  const [counted, setCounted] = useState<string>('0')

  const period = useMemo(() => {
    const now = new Date()
    const start = new Date(now); start.setHours(0,0,0,0)
    const fmt = (d: Date) => d.toLocaleString()
    return { from: fmt(start), to: fmt(now) }
  }, [])

  async function refresh() {
    try {
      const api = await ensureShiftsApi()
      if (api.getCurrentShift) {
        const s = await api.getCurrentShift()
        setShift(s ?? null)
      } else {
        // fallback simples em dev
        const n = localStorage.getItem('pdv.mock.shiftNumber')
        setShift({ number: n ?? '—', openedAt: n ? new Date().toLocaleString() : undefined })
      }

      if (api.listMovements) {
        const rows = await api.listMovements()
        setMovements(rows ?? [])
      } else {
        const rows = JSON.parse(localStorage.getItem('pdv.mock.movs') || '[]')
        setMovements(rows)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { void refresh() }, [])

  // ---------------------------------------------------------------------------
  // Abertura de turno
  // ---------------------------------------------------------------------------
  async function handleOpenShift() {
    try {
      const cfg = await getSettings()
      const printer = await resolvePrinterName('CAIXA')
      const api = await ensureShiftsApi()

      // Persistência
      if (api.openShift) {
        await api.openShift(Number(initialCash || '0'))
      } else {
        const current = Number(localStorage.getItem('pdv.mock.shiftNumber') || '0') + 1
        localStorage.setItem('pdv.mock.shiftNumber', String(current))
      }
      await refresh()

      const computedShiftNumber =
        shift?.number ?? (localStorage.getItem('pdv.mock.shiftNumber') ?? 1)

      // Ticket
      const bytes = ticketOpenShift({
        header: {
          companyName: cfg.companyName ?? 'PDVTouch Restaurante',
          cnpj: cfg.cnpj ?? undefined,
          posName: 'PDV-01',
          // se quiser, injete storeName quando tiver no settings
          storeName: cfg.addressLine1 ? undefined : undefined,
        },
        shiftNumber: computedShiftNumber,
        operator: {
          name: (user?.name ?? '-'),
          role: (user?.role ?? 'CAIXA'),
        },
        openedAt: new Date().toLocaleString(),
        initialCash: Number(initialCash || '0'),
      })
      await printRaw(bytes, printer)
      alert('Turno aberto e ticket impresso.')
    } catch (e: any) {
      console.error(e)
      alert(`Falha ao abrir turno: ${e?.message ?? e}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Movimentação (SANGRIA/SUPRIMENTO)
  // ---------------------------------------------------------------------------
  async function handleMovement() {
    try {
      const value = Number(movValue || '0')
      if (!value || value <= 0) {
        alert('Informe um valor válido.')
        return
      }

      const cfg = await getSettings()
      const printer = await resolvePrinterName('CAIXA')
      const api = await ensureShiftsApi()

      // Persistência
      const row: MovementRow = {
        type: movType,
        amount: value,
        reason: movReason || undefined,
        timestamp: new Date().toLocaleString(),
      }

      if (api.addMovement) {
        await api.addMovement(movType, value, movReason || '')
      } else {
        const arr = JSON.parse(localStorage.getItem('pdv.mock.movs') || '[]')
        arr.push(row)
        localStorage.setItem('pdv.mock.movs', JSON.stringify(arr))
      }
      await refresh()

      // número do turno
      const computedShiftNumber =
        shift?.number ?? (localStorage.getItem('pdv.mock.shiftNumber') ?? 1)

      // Ticket
      const bytes = ticketCashMovement({
        header: { companyName: cfg.companyName ?? 'PDVTouch Restaurante', posName: 'PDV-01' },
        shiftNumber: computedShiftNumber,
        operator: { name: (user?.name ?? '-'), role: (user?.role ?? 'CAIXA') },
        movement: movType,
        amount: value,
        reason: movReason || undefined,
        timestamp: new Date().toLocaleString(),
      })
      await printRaw(bytes, printer)
      alert(`${movType} registrada e ticket impresso.`)

      setMovValue('0'); setMovReason('')
    } catch (e: any) {
      console.error(e)
      alert(`Falha na movimentação: ${e?.message ?? e}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Fechamento de turno
  // ---------------------------------------------------------------------------
  async function handleCloseShift() {
    try {
      const cfg = await getSettings()
      const printer = await resolvePrinterName('CAIXA')
      const api = await ensureShiftsApi()

      const totals = getPeriodTotals()

      // Fluxo caixa esperado
      const opening   = Number(initialCash || '0')
      const cashIn    = movements.filter(m => m.type === 'SUPRIMENTO').reduce((a, m) => a + (m.amount || 0), 0)
      const cashOut   = movements.filter(m => m.type === 'SANGRIA')   .reduce((a, m) => a + (m.amount || 0), 0)
      const expected  = opening + cashIn - cashOut + (totals.payments.CASH || 0)
      const actual    = Number(counted || '0')
      const difference = Number((actual - expected).toFixed(2))

      if (api.closeShift) {
        try { await api.closeShift() } catch {}
      }

      const computedShiftNumber =
        shift?.number ?? (localStorage.getItem('pdv.mock.shiftNumber') ?? 1)

      // Ticket
      const bytes = ticketCloseShift({
        header: {
          companyName: cfg.companyName ?? 'PDVTouch Restaurante',
          cnpj: cfg.cnpj ?? undefined,
          posName: 'PDV-01',
        },
        shiftNumber: computedShiftNumber,
        operator: { name: (user?.name ?? '-'), role: (user?.role ?? 'CAIXA') },
        period,
        counters: { salesQty: totals.salesQty, gross: totals.gross, avgTicket: totals.avgTicket },
        payments: totals.payments,
        drawer: { opening, cashIn, cashOut, expected, actual, difference },
        timestamp: new Date().toLocaleString(),
        notes: difference === 0 ? 'Fechamento sem divergências.' : 'Atenção: diferença detectada.',
      })
      await printRaw(bytes, printer)

      alert('Turno fechado e ticket impresso.')
      localStorage.removeItem('pdv.mock.movs')
    } catch (e: any) {
      console.error(e)
      alert(`Falha ao fechar turno: ${e?.message ?? e}`)
    }
  }

  // ---------------------------------------------------------------------------

  return (
    <div style={{ padding: 16 }}>
      <h2>Turno</h2>

      <section style={card}>
        <h3 style={h3}>Situação atual</h3>
        <div>Turno #: <b>{String(shift?.number ?? (localStorage.getItem('pdv.mock.shiftNumber') ?? '—'))}</b></div>
        <div>Abertura: <b>{shift?.openedAt ?? '—'}</b></div>
        <div>Operador: <b>{user?.name ?? '-'}</b> — {user?.role ?? '-'}</div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
        {/* Abertura */}
        <section style={card}>
          <h3 style={h3}>Abertura de turno</h3>
          <div style={row}>
            <label>Fundo de troco (inicial)</label>
            <input
              style={input}
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value)}
            />
          </div>
          <button style={btnPrimary} onClick={handleOpenShift}>Abrir turno e imprimir</button>
        </section>

        {/* Movimentação */}
        <section style={card}>
          <h3 style={h3}>Movimentação (caixa)</h3>
          <div style={row}>
            <label>Tipo</label>
            <select style={input} value={movType} onChange={e => setMovType(e.target.value as CashMovementType)}>
              <option value="SUPRIMENTO">SUPRIMENTO</option>
              <option value="SANGRIA">SANGRIA</option>
            </select>
          </div>
          <div style={row}>
            <label>Valor</label>
            <input style={input} value={movValue} onChange={e => setMovValue(e.target.value)} />
          </div>
          <div style={row}>
            <label>Motivo (opcional)</label>
            <input style={input} value={movReason} onChange={e => setMovReason(e.target.value)} />
          </div>
          <button style={btn} onClick={handleMovement}>Registrar e imprimir</button>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>Histórico do turno</h4>
            {movements.length === 0 && <div style={{ opacity: .6 }}>Sem movimentos.</div>}
            {movements.map((m, i) => (
              <div key={m.id ?? i} style={{ padding: '6px 0', borderBottom: '1px dotted #eee', fontSize: 14 }}>
                <b>{m.type}</b> — {money(m.amount)} {m.reason ? `• ${m.reason}` : ''} <span style={{ opacity: .65 }}>({m.timestamp})</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Fechamento */}
      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={h3}>Fechamento do turno</h3>
        <div style={row}>
          <label>Dinheiro contado (R$)</label>
          <input style={input} value={counted} onChange={e => setCounted(e.target.value)} />
        </div>
        <button style={{ ...btnPrimary, background: '#16a34a', borderColor: '#15803d' }} onClick={handleCloseShift}>
          Fechar turno e imprimir
        </button>
      </section>
    </div>
  )
}

// ===== estilos simples =======================================================

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 16,
}

const h3: React.CSSProperties = { margin: 0, marginBottom: 10, fontSize: 16 }

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '180px 1fr',
  gap: 8,
  alignItems: 'center',
  margin: '6px 0',
}

const input: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 14,
  width: '100%',
}

const btn: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  ...btn,
  background: '#3b82f6',
  color: '#fff',
  borderColor: '#2563eb',
}
