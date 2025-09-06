// src/lib/escpos.ts
// Gera strings “ESC/POS-like” para o mock de impressora.
// (O WS atual apenas loga o texto; os códigos ESC são inofensivos no console.)

import type { Order } from '../db/models'

type XTotals = {
  count: number
  gross: number
  byMethod: Record<string, number>
}

const ESC = '\x1B'
const GS = '\x1D'
const INIT = ESC + '@'
const CENTER = ESC + 'a' + '\x01'
const LEFT = ESC + 'a' + '\x00'
const BOLD_ON = ESC + 'E' + '\x01'
const BOLD_OFF = ESC + 'E' + '\x00'
const DOUBLE_ON = GS + '!' + '\x11' // height+width x2
const DOUBLE_OFF = GS + '!' + '\x00'
const CUT = GS + 'V' + '\x00'      // full cut (muitos printers respeitam)

function line(ch = '-', w = 32) {
  return ch.repeat(w)
}
function fmtMoney(v: number) {
  return 'R$ ' + v.toFixed(2)
}
function fmtDate(ts: number) {
  const d = new Date(ts)
  const dd = d.toLocaleDateString()
  const hh = d.toLocaleTimeString()
  return `${dd} ${hh}`
}

export function ticketX({
  empresa = 'PDVTouch Restaurante',
  cnpj = '00.000.000/0000-00',
  periodo,
  totals
}: {
  empresa?: string
  cnpj?: string
  periodo: { from: number; to: number }
  totals: XTotals
}) {
  const rows: string[] = []
  rows.push(INIT)
  rows.push(CENTER + BOLD_ON + DOUBLE_ON + 'RELATÓRIO X' + DOUBLE_OFF + BOLD_OFF)
  rows.push(CENTER + empresa)
  rows.push(CENTER + 'CNPJ: ' + cnpj)
  rows.push(LEFT + line())
  rows.push(`Período: ${fmtDate(periodo.from)} → ${fmtDate(periodo.to)}`)
  rows.push(line())
  rows.push(`Vendas (qtd): ${totals.count}`)
  rows.push(`Faturamento bruto: ${fmtMoney(totals.gross)}`)
  rows.push(line())
  rows.push('Por método de pagamento:')
  if (Object.keys(totals.byMethod).length === 0) {
    rows.push('  —')
  } else {
    for (const [m, v] of Object.entries(totals.byMethod)) {
      rows.push(`  ${m.padEnd(8)} ${fmtMoney(v)}`)
    }
  }
  rows.push(line())
  rows.push(CENTER + 'Impresso: ' + fmtDate(Date.now()))
  rows.push('\n\n\n' + CUT)
  return rows.join('\n')
}

export function ticketZ({
  empresa = 'PDVTouch Restaurante',
  cnpj = '00.000.000/0000-00',
  periodo,
  totals,
  zNumber
}: {
  empresa?: string
  cnpj?: string
  periodo: { from: number; to: number }
  totals: XTotals
  zNumber: number // sequencial simples (id do Z)
}) {
  const rows: string[] = []
  rows.push(INIT)
  rows.push(CENTER + BOLD_ON + DOUBLE_ON + 'FECHAMENTO Z' + DOUBLE_OFF + BOLD_OFF)
  rows.push(CENTER + empresa)
  rows.push(CENTER + 'CNPJ: ' + cnpj)
  rows.push(CENTER + `Z#: ${zNumber}`)
  rows.push(LEFT + line())
  rows.push(`Período: ${fmtDate(periodo.from)} → ${fmtDate(periodo.to)}`)
  rows.push(line())
  rows.push(`Vendas (qtd): ${totals.count}`)
  rows.push(`Faturamento bruto: ${fmtMoney(totals.gross)}`)
  rows.push(line())
  rows.push('Por método de pagamento:')
  if (Object.keys(totals.byMethod).length === 0) {
    rows.push('  —')
  } else {
    for (const [m, v] of Object.entries(totals.byMethod)) {
      rows.push(`  ${m.padEnd(8)} ${fmtMoney(v)}`)
    }
  }
  rows.push(line())
  rows.push(CENTER + 'Emitido: ' + fmtDate(Date.now()))
  rows.push('\n\n\n' + CUT)
  return rows.join('\n')
}
