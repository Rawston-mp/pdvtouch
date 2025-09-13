// src/lib/escposTurno.ts
// ============================================================================
// Tickets ESC/POS relacionados a TURNO/CAIXA: abertura, movimentação e fechamento
// ============================================================================

import {
  escposInit,
  escposAlignLeft,
  escposAlignCenter,
  escposEmph,
  escposDouble,
  escposNewLine,
  escposCut,
  escposText,
} from './escpos'

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, b) => a + b.length, 0)
  const out = new Uint8Array(len)
  let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }
  return out
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const asMoney = (v: number) => BRL.format(Number.isFinite(v) ? v : 0)

export type ShiftHeader = {
  companyName: string
  cnpj?: string
  posName?: string
  storeName?: string
  address1?: string
  address2?: string
}

export type Operator = {
  name: string
  role?: string
  id?: string | number
}

export type PaymentsBreakdown = {
  CASH?: number
  PIX?: number
  TEF?: number
  OTHER?: number
}

export type CashDrawerSnapshot = {
  opening?: number
  cashIn?: number
  cashOut?: number
  expected?: number
  actual?: number
  difference?: number
}

export function ticketOpenShift(params: {
  header: ShiftHeader
  shiftNumber: number | string
  operator: Operator
  openedAt: string
  initialCash?: number
  notes?: string
}): Uint8Array {
  const P: Uint8Array[] = []
  P.push(escposInit())

  P.push(escposAlignCenter())
  P.push(escposDouble(true))
  P.push(escposText('ABERTURA DE TURNO\n'))
  P.push(escposDouble(false))
  P.push(escposText(`${params.header.companyName}\n`))
  if (params.header.cnpj) P.push(escposText(`CNPJ: ${params.header.cnpj}\n`))
  if (params.header.storeName) P.push(escposText(`${params.header.storeName}\n`))
  if (params.header.posName)   P.push(escposText(`PDV: ${params.header.posName}\n`))
  P.push(escposNewLine())

  P.push(escposAlignLeft())
  P.push(escposText(`Turno #: ${params.shiftNumber}\n`))
  P.push(escposText(`Abertura: ${params.openedAt}\n`))
  P.push(escposText(`Operador: ${params.operator.name}${params.operator.role ? ' — ' + params.operator.role : ''}\n`))
  if (params.operator.id) P.push(escposText(`ID Operador: ${params.operator.id}\n`))
  if (Number.isFinite(params.initialCash ?? NaN)) {
    P.push(escposText(`Fundo de troco (inicial): ${asMoney(params.initialCash || 0)}\n`))
  }
  if (params.notes) {
    P.push(escposNewLine())
    P.push(escposText(params.notes + '\n'))
  }

  P.push(escposNewLine(3))
  P.push(escposCut(true))
  return concat(P)
}

export type CashMovementType = 'SANGRIA' | 'SUPRIMENTO'

export function ticketCashMovement(params: {
  header: ShiftHeader
  shiftNumber: number | string
  operator: Operator
  movement: CashMovementType
  amount: number
  reason?: string
  timestamp: string
}): Uint8Array {
  const P: Uint8Array[] = []
  P.push(escposInit())

  P.push(escposAlignCenter())
  P.push(escposEmph(true))
  P.push(escposText(`MOVIMENTAÇÃO DE CAIXA — ${params.movement}\n`))
  P.push(escposEmph(false))
  P.push(escposText(`${params.header.companyName}\n`))
  if (params.header.posName) P.push(escposText(`PDV: ${params.header.posName}\n`))
  P.push(escposNewLine())

  P.push(escposAlignLeft())
  P.push(escposText(`Turno #: ${params.shiftNumber}\n`))
  P.push(escposText(`Data/Hora: ${params.timestamp}\n`))
  P.push(escposText(`Operador: ${params.operator.name}${params.operator.role ? ' — ' + params.operator.role : ''}\n`))
  P.push(escposNewLine())
  P.push(escposEmph(true))
  P.push(escposText(`Valor: ${asMoney(params.amount)}\n`))
  P.push(escposEmph(false))
  if (params.reason) {
    P.push(escposText(`Motivo: ${params.reason}\n`))
  }

  P.push(escposNewLine(3))
  P.push(escposCut(true))
  return concat(P)
}

export function ticketCloseShift(params: {
  header: ShiftHeader
  shiftNumber: number | string
  operator: Operator
  period: { from: string; to: string }
  counters: { salesQty: number; gross: number; avgTicket: number }
  payments: PaymentsBreakdown
  drawer: CashDrawerSnapshot
  timestamp: string
  notes?: string
}): Uint8Array {
  const P: Uint8Array[] = []
  P.push(escposInit())

  P.push(escposAlignCenter())
  P.push(escposDouble(true))
  P.push(escposText('FECHAMENTO DE TURNO\n'))
  P.push(escposDouble(false))
  P.push(escposText(`${params.header.companyName}\n`))
  if (params.header.cnpj) P.push(escposText(`CNPJ: ${params.header.cnpj}\n`))
  if (params.header.storeName) P.push(escposText(`${params.header.storeName}\n`))
  if (params.header.posName)   P.push(escposText(`PDV: ${params.header.posName}\n`))
  P.push(escposNewLine())

  P.push(escposAlignLeft())
  P.push(escposText(`Turno #: ${params.shiftNumber}\n`))
  P.push(escposText(`Período: ${params.period.from} → ${params.period.to}\n`))
  P.push(escposText(`Fechamento: ${params.timestamp}\n`))
  P.push(escposText(`Operador: ${params.operator.name}${params.operator.role ? ' — ' + params.operator.role : ''}\n`))
  P.push(escposNewLine())

  P.push(escposEmph(true)); P.push(escposText('Resumo de vendas\n')); P.push(escposEmph(false))
  P.push(escposText(`  Vendas (qtd): ${params.counters.salesQty}\n`))
  P.push(escposText(`  Faturamento bruto: ${asMoney(params.counters.gross)}\n`))
  P.push(escposText(`  Ticket médio: ${asMoney(params.counters.avgTicket)}\n`))
  P.push(escposNewLine())

  P.push(escposEmph(true)); P.push(escposText('Pagamentos\n')); P.push(escposEmph(false))
  const p = params.payments
  if (p.CASH)  P.push(escposText(`  Dinheiro: ${asMoney(p.CASH)}\n`))
  if (p.PIX)   P.push(escposText(`  PIX:      ${asMoney(p.PIX)}\n`))
  if (p.TEF)   P.push(escposText(`  TEF:      ${asMoney(p.TEF)}\n`))
  if (p.OTHER) P.push(escposText(`  Outros:   ${asMoney(p.OTHER)}\n`))
  P.push(escposNewLine())

  P.push(escposEmph(true)); P.push(escposText('Conferência de caixa\n')); P.push(escposEmph(false))
  const d = params.drawer
  if (Number.isFinite(d.opening ?? NaN))  P.push(escposText(`  Abertura:        ${asMoney(d.opening || 0)}\n`))
  if (Number.isFinite(d.cashIn ?? NaN))   P.push(escposText(`  Suprimentos:     ${asMoney(d.cashIn || 0)}\n`))
  if (Number.isFinite(d.cashOut ?? NaN))  P.push(escposText(`  Sangrias:        ${asMoney(d.cashOut || 0)}\n`))
  if (Number.isFinite(d.expected ?? NaN)) P.push(escposText(`  Esperado (R$):   ${asMoney(d.expected || 0)}\n`))
  if (Number.isFinite(d.actual ?? NaN))   P.push(escposText(`  Contado  (R$):   ${asMoney(d.actual || 0)}\n`))
  if (Number.isFinite(d.difference ?? NaN)) {
    const diff = d.difference || 0
    const warn = Math.abs(diff) > 0.009
    if (warn) P.push(escposEmph(true))
    P.push(escposText(`  Diferença:       ${asMoney(diff)}\n`))
    if (warn) P.push(escposEmph(false))
  }

  if (params.notes) {
    P.push(escposNewLine())
    P.push(escposText(params.notes + '\n'))
  }

  P.push(escposNewLine(3))
  P.push(escposCut(false))
  return concat(P)
}
